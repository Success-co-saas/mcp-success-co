// Insights Tools
// Aggregate tools for high-level company insights and cross-entity analysis

import {
  callSuccessCoGraphQL,
  getLeadershipTeamId,
  getUserContext,
} from "./core.js";

/**
 * Get execution health overview
 * Returns a comprehensive view of company execution across rocks, issues, and todos
 * @param {Object} args - Arguments object
 * @param {string} [args.teamId] - Filter by team ID
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getExecutionHealth(args = {}) {
  const { teamId: providedTeamId, leadershipTeam = false } = args;

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // Build filter for team if provided
  // Note: Issues and todos have direct teamId field, but rocks use teamsOnRocks junction table
  const teamFilterForIssuesAndTodos = teamId
    ? `, teamId: {equalTo: "${teamId}"}`
    : "";

  // Get rocks data (without team filter - we'll filter after getting team rock IDs)
  const rocksQuery = `
    query {
      rocks(filter: {stateId: {equalTo: "ACTIVE"}}) {
        nodes {
          id
          rockStatusId
          dueDate
          statusUpdatedAt
        }
      }
    }
  `;

  // Get issues data
  const issuesQuery = `
    query {
      issues(filter: {stateId: {equalTo: "ACTIVE"}, issueStatusId: {equalTo: "TODO"}${teamFilterForIssuesAndTodos}}) {
        nodes {
          id
          priorityNo
          statusUpdatedAt
        }
      }
    }
  `;

  // Get todos data
  const todosQuery = `
    query {
      todos(filter: {stateId: {equalTo: "ACTIVE"}, todoStatusId: {equalTo: "TODO"}${teamFilterForIssuesAndTodos}}) {
        nodes {
          id
          dueDate
        }
      }
    }
  `;

  // Get team rocks if filtering by team
  const teamsOnRocksQuery = teamId
    ? `
    query {
      teamsOnRocks(filter: {teamId: {equalTo: "${teamId}"}, stateId: {equalTo: "ACTIVE"}}) {
        nodes {
          rockId
        }
      }
    }
  `
    : null;

  // Execute all queries in parallel
  const queryPromises = [
    callSuccessCoGraphQL(rocksQuery),
    callSuccessCoGraphQL(issuesQuery),
    callSuccessCoGraphQL(todosQuery),
  ];

  if (teamsOnRocksQuery) {
    queryPromises.push(callSuccessCoGraphQL(teamsOnRocksQuery));
  }

  const results = await Promise.all(queryPromises);
  const [rocksResult, issuesResult, todosResult, teamsOnRocksResult] = results;

  if (
    !rocksResult.ok ||
    !issuesResult.ok ||
    !todosResult.ok ||
    (teamsOnRocksResult && !teamsOnRocksResult.ok)
  ) {
    const errors = [];
    if (!rocksResult.ok) errors.push(`Rocks: ${rocksResult.error}`);
    if (!issuesResult.ok) errors.push(`Issues: ${issuesResult.error}`);
    if (!todosResult.ok) errors.push(`Todos: ${todosResult.error}`);
    if (teamsOnRocksResult && !teamsOnRocksResult.ok)
      errors.push(`TeamsOnRocks: ${teamsOnRocksResult.error}`);

    return {
      content: [
        {
          type: "text",
          text: `Error fetching execution health data:\n${errors.join("\n")}`,
        },
      ],
    };
  }

  let rocks = rocksResult.data?.data?.rocks?.nodes || [];
  const issues = issuesResult.data?.data?.issues?.nodes || [];
  const todos = todosResult.data?.data?.todos?.nodes || [];

  // Filter rocks by team if teamId was provided
  if (teamId && teamsOnRocksResult) {
    const teamRockIds = new Set(
      teamsOnRocksResult.data?.data?.teamsOnRocks?.nodes?.map(
        (tor) => tor.rockId
      ) || []
    );
    rocks = rocks.filter((rock) => teamRockIds.has(rock.id));
  }

  // Calculate rocks metrics
  const rocksMetrics = {
    total: rocks.length,
    onTrack: rocks.filter((r) => r.rockStatusId === "ONTRACK").length,
    offTrack: rocks.filter((r) => r.rockStatusId === "OFFTRACK").length,
    complete: rocks.filter((r) => r.rockStatusId === "COMPLETE").length,
    atRisk: rocks.filter(
      (r) =>
        r.rockStatusId === "OFFTRACK" ||
        (r.rockStatusId === "ONTRACK" &&
          new Date(r.statusUpdatedAt) < fourteenDaysAgo)
    ).length,
    overdue: rocks.filter(
      (r) =>
        r.dueDate && new Date(r.dueDate) < now && r.rockStatusId !== "COMPLETE"
    ).length,
  };

  // Calculate issues metrics
  const issuesMetrics = {
    total: issues.length,
    stuck: issues.filter((i) => new Date(i.statusUpdatedAt) < thirtyDaysAgo)
      .length,
    highPriority: issues.filter((i) => i.priorityNo <= 1).length,
  };

  // Calculate todos metrics
  const todosMetrics = {
    total: todos.length,
    overdue: todos.filter((t) => t.dueDate && new Date(t.dueDate) < now).length,
  };

  // Calculate overall health score (0-100)
  // Formula: Weight different factors and normalize to 0-100
  let healthScore = 100;

  // Rocks impact (40% of score)
  if (rocksMetrics.total > 0) {
    const rocksHealthPercent =
      (rocksMetrics.onTrack / rocksMetrics.total) * 100;
    healthScore -= (100 - rocksHealthPercent) * 0.4;
  }

  // Issues impact (30% of score)
  if (issuesMetrics.total > 0) {
    const issuesHealthPercent =
      ((issuesMetrics.total - issuesMetrics.stuck) / issuesMetrics.total) * 100;
    healthScore -= (100 - issuesHealthPercent) * 0.3;
  }

  // Todos impact (30% of score)
  if (todosMetrics.total > 0) {
    const todosHealthPercent =
      ((todosMetrics.total - todosMetrics.overdue) / todosMetrics.total) * 100;
    healthScore -= (100 - todosHealthPercent) * 0.3;
  }

  healthScore = Math.max(0, Math.round(healthScore));

  // Determine health status
  let healthStatus = "Excellent";
  if (healthScore < 90) healthStatus = "Good";
  if (healthScore < 75) healthStatus = "Fair";
  if (healthScore < 60) healthStatus = "Needs Attention";
  if (healthScore < 40) healthStatus = "Critical";

  // Identify blockers
  const blockers = [];
  if (rocksMetrics.offTrack > 0) {
    blockers.push(
      `${rocksMetrics.offTrack} rock${
        rocksMetrics.offTrack > 1 ? "s" : ""
      } off track`
    );
  }
  if (rocksMetrics.overdue > 0) {
    blockers.push(
      `${rocksMetrics.overdue} overdue rock${
        rocksMetrics.overdue > 1 ? "s" : ""
      }`
    );
  }
  if (issuesMetrics.stuck > 0) {
    blockers.push(
      `${issuesMetrics.stuck} stuck issue${
        issuesMetrics.stuck > 1 ? "s" : ""
      } (30+ days)`
    );
  }
  if (issuesMetrics.highPriority > 0) {
    blockers.push(
      `${issuesMetrics.highPriority} high priority issue${
        issuesMetrics.highPriority > 1 ? "s" : ""
      }`
    );
  }
  if (todosMetrics.overdue > 0) {
    blockers.push(
      `${todosMetrics.overdue} overdue todo${
        todosMetrics.overdue > 1 ? "s" : ""
      }`
    );
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          healthScore,
          healthStatus,
          teamId: teamId || "All teams",
          rocks: rocksMetrics,
          issues: issuesMetrics,
          todos: todosMetrics,
          blockers,
          recommendations:
            blockers.length > 0
              ? [
                  "Address off-track rocks immediately",
                  "Review stuck issues in next L10 meeting",
                  "Follow up on overdue items",
                ]
              : ["Keep up the great work! All systems executing well."],
        }),
      },
    ],
  };
}

/**
 * Get user workload analysis
 * Returns aggregated workload data for users (rocks, issues, todos counts)
 * @param {Object} args - Arguments object
 * @param {string} [args.teamId] - Filter by team ID
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID
 * @param {string} [args.userId] - Get workload for specific user
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getUserWorkload(args = {}) {
  try {
    const { teamId: providedTeamId, leadershipTeam = false, userId } = args;

    // Resolve teamId if leadershipTeam is true
    let teamId = providedTeamId;
    if (leadershipTeam && !providedTeamId) {
      teamId = await getLeadershipTeamId();
      if (!teamId) {
        return {
          content: [
            {
              type: "text",
              text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
            },
          ],
        };
      }
    }

    // Build filters
    // Note: Issues and todos have direct teamId field, but rocks use teamsOnRocks junction table
    // Users use usersOnTeams junction table
    const teamFilterForIssuesAndTodos = teamId
      ? `, teamId: {equalTo: "${teamId}"}`
      : "";
    const userFilter = userId ? `, userId: {equalTo: "${userId}"}` : "";
    const issuesAndTodosFilters = [teamFilterForIssuesAndTodos, userFilter]
      .filter(Boolean)
      .join("");
    const rocksFilters = userFilter; // Only user filter for rocks
    const userIdFilter = userId ? `, id: {equalTo: "${userId}"}` : "";

    // Get all active rocks, issues, and todos
    const query = `
    query {
      rocks(filter: {stateId: {equalTo: "ACTIVE"}, rockStatusId: {notEqualTo: "COMPLETE"}${rocksFilters}}) {
        nodes {
          id
          userId
        }
      }
      issues(filter: {stateId: {equalTo: "ACTIVE"}, issueStatusId: {equalTo: "TODO"}${issuesAndTodosFilters}}) {
        nodes {
          userId
        }
      }
      todos(filter: {stateId: {equalTo: "ACTIVE"}, todoStatusId: {equalTo: "TODO"}${issuesAndTodosFilters}}) {
        nodes {
          userId
        }
      }
      users(filter: {stateId: {equalTo: "ACTIVE"}${userIdFilter}}) {
        nodes {
          id
          firstName
          lastName
          email
        }
      }
    }
  `;

    // Build additional queries for team-based filtering
    const additionalQueries = [];

    // Query teamsOnRocks if filtering by team
    if (teamId) {
      additionalQueries.push(
        callSuccessCoGraphQL(`
        query {
          teamsOnRocks(filter: {teamId: {equalTo: "${teamId}"}, stateId: {equalTo: "ACTIVE"}}) {
            nodes {
              rockId
            }
          }
        }
      `)
      );
    }

    // Query usersOnTeams if filtering by team
    if (teamId) {
      additionalQueries.push(
        callSuccessCoGraphQL(`
        query {
          usersOnTeams(filter: {teamId: {equalTo: "${teamId}"}, stateId: {equalTo: "ACTIVE"}}) {
            nodes {
              userId
            }
          }
        }
      `)
      );
    }

    let result;
    let teamsOnRocksResult = null;
    let usersOnTeamsResult = null;

    try {
      const queryPromises = [callSuccessCoGraphQL(query), ...additionalQueries];
      const results = await Promise.all(queryPromises);

      result = results[0];
      if (teamId) {
        teamsOnRocksResult = results[1];
        usersOnTeamsResult = results[2];
      }
    } catch (error) {
      console.error("[getUserWorkload] GraphQL call failed:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error calling GraphQL: ${error.message}`,
          },
        ],
      };
    }

    if (!result.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching workload data: ${result.error}`,
          },
        ],
      };
    }

    if (teamsOnRocksResult && !teamsOnRocksResult.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching team rocks data: ${teamsOnRocksResult.error}`,
          },
        ],
      };
    }

    if (usersOnTeamsResult && !usersOnTeamsResult.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching team users data: ${usersOnTeamsResult.error}`,
          },
        ],
      };
    }

    const data = result.data?.data;
    let rocks = data?.rocks?.nodes || [];
    const issues = data?.issues?.nodes || [];
    const todos = data?.todos?.nodes || [];
    let users = data?.users?.nodes || [];

    // Filter rocks by team if teamId was provided
    if (teamId && teamsOnRocksResult) {
      const teamRockIds = new Set(
        teamsOnRocksResult.data?.data?.teamsOnRocks?.nodes?.map(
          (tor) => tor.rockId
        ) || []
      );
      rocks = rocks.filter((rock) => teamRockIds.has(rock.id));
    }

    // Filter users by team if teamId was provided
    if (teamId && usersOnTeamsResult) {
      const teamUserIds = new Set(
        usersOnTeamsResult.data?.data?.usersOnTeams?.nodes?.map(
          (uot) => uot.userId
        ) || []
      );
      users = users.filter((user) => teamUserIds.has(user.id));
    }

    // Count items by user
    const workloadByUser = {};

    users.forEach((user) => {
      if (user && user.id) {
        workloadByUser[user.id] = {
          userId: user.id,
          userName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          email: user.email || "",
          rocksCount: 0,
          issuesCount: 0,
          todosCount: 0,
          totalItems: 0,
        };
      }
    });

    rocks.forEach((rock) => {
      if (rock && rock.userId && workloadByUser[rock.userId]) {
        workloadByUser[rock.userId].rocksCount++;
        workloadByUser[rock.userId].totalItems++;
      }
    });

    issues.forEach((issue) => {
      if (issue && issue.userId && workloadByUser[issue.userId]) {
        workloadByUser[issue.userId].issuesCount++;
        workloadByUser[issue.userId].totalItems++;
      }
    });

    todos.forEach((todo) => {
      if (todo && todo.userId && workloadByUser[todo.userId]) {
        workloadByUser[todo.userId].todosCount++;
        workloadByUser[todo.userId].totalItems++;
      }
    });

    // Convert to array and sort by total items
    const workloadArray = Object.values(workloadByUser).sort(
      (a, b) => b.totalItems - a.totalItems
    );

    // Calculate statistics
    const totalItems = workloadArray.reduce(
      (sum, user) => sum + user.totalItems,
      0
    );
    const avgItemsPerUser =
      workloadArray.length > 0
        ? Math.round(totalItems / workloadArray.length)
        : 0;
    const maxItems = workloadArray.length > 0 ? workloadArray[0].totalItems : 0;
    const overloadedUsers = workloadArray.filter(
      (u) => u.totalItems > avgItemsPerUser * 1.5
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            summary: {
              totalUsers: workloadArray.length,
              totalItems,
              avgItemsPerUser,
              maxItems,
              overloadedUsersCount: overloadedUsers.length,
            },
            overloadedUsers: overloadedUsers.map((u) => ({
              userName: u.userName,
              totalItems: u.totalItems,
            })),
            userWorkload: workloadArray,
          }),
        },
      ],
    };
  } catch (error) {
    console.error("[getUserWorkload] Error:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error in getUserWorkload: ${error.message}\nStack: ${error.stack}`,
        },
      ],
    };
  }
}

/**
 * Get company insights
 * High-level overview combining VTO, execution health, and team performance
 * @param {Object} args - Arguments object
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getCompanyInsights(args = {}) {
  const { leadershipTeam = true } = args;

  // Get leadership team ID
  const teamId = await getLeadershipTeamId();
  if (!teamId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
        },
      ],
    };
  }

  // Get execution health
  const executionHealth = await getExecutionHealth({ teamId });
  const healthText = executionHealth.content[0].text;

  // Try to parse as JSON, if it fails it's probably an error message
  let healthData;
  try {
    healthData = JSON.parse(healthText);
  } catch (error) {
    // If parsing fails, it's likely an error message - return it as-is
    return {
      content: [
        {
          type: "text",
          text: healthText,
        },
      ],
    };
  }

  // Get current quarter rocks
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);
  const quarterStartMonth = (currentQuarter - 1) * 3 + 1;
  const quarterEndMonth = currentQuarter * 3;
  const quarterStartDate = `${now.getFullYear()}-${String(
    quarterStartMonth
  ).padStart(2, "0")}-01`;
  const lastDayOfMonth = new Date(
    now.getFullYear(),
    quarterEndMonth,
    0
  ).getDate();
  const quarterEndDate = `${now.getFullYear()}-${String(
    quarterEndMonth
  ).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;

  const rocksQuery = `
    query {
      rocks(filter: {
        stateId: {equalTo: "ACTIVE"}, 
        dueDate: {greaterThanOrEqualTo: "${quarterStartDate}", lessThanOrEqualTo: "${quarterEndDate}"}
      }) {
        nodes {
          id
          rockStatusId
          dueDate
        }
      }
    }
  `;

  const rocksResult = await callSuccessCoGraphQL(rocksQuery);
  const quarterRocks = rocksResult.ok
    ? rocksResult.data?.data?.rocks?.nodes || []
    : [];

  // Calculate quarter completion rate
  const totalQuarterRocks = quarterRocks.length;
  const completedQuarterRocks = quarterRocks.filter(
    (r) => r.rockStatusId === "COMPLETE"
  ).length;
  const quarterCompletionRate =
    totalQuarterRocks > 0
      ? Math.round((completedQuarterRocks / totalQuarterRocks) * 100)
      : 0;

  // Calculate days remaining in quarter
  const daysRemainingInQuarter = Math.ceil(
    (new Date(quarterEndDate) - now) / (1000 * 60 * 60 * 24)
  );

  // Generate insights
  const insights = [];

  if (healthData.healthScore >= 90) {
    insights.push({
      type: "positive",
      message: "Excellent execution! Company is firing on all cylinders.",
    });
  } else if (healthData.healthScore >= 75) {
    insights.push({
      type: "neutral",
      message:
        "Good execution with some areas for improvement. Review blockers.",
    });
  } else {
    insights.push({
      type: "negative",
      message:
        "Execution needs attention. Focus on addressing blockers immediately.",
    });
  }

  if (quarterCompletionRate > 0) {
    insights.push({
      type: "info",
      message: `Q${currentQuarter} progress: ${quarterCompletionRate}% of rocks completed with ${daysRemainingInQuarter} days remaining`,
    });
  }

  if (healthData.rocks.atRisk > 0) {
    insights.push({
      type: "warning",
      message: `${healthData.rocks.atRisk} rock${
        healthData.rocks.atRisk > 1 ? "s" : ""
      } need attention - either off track or not updated in 14+ days`,
    });
  }

  if (healthData.issues.stuck > 0) {
    insights.push({
      type: "warning",
      message: `${healthData.issues.stuck} issue${
        healthData.issues.stuck > 1 ? "s" : ""
      } stuck for 30+ days - review in next L10`,
    });
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          overallHealth: {
            score: healthData.healthScore,
            status: healthData.healthStatus,
          },
          currentQuarter: {
            quarter: currentQuarter,
            year: now.getFullYear(),
            daysRemaining: daysRemainingInQuarter,
            rocksTotal: totalQuarterRocks,
            rocksCompleted: completedQuarterRocks,
            completionRate: quarterCompletionRate,
          },
          executionMetrics: {
            rocks: healthData.rocks,
            issues: healthData.issues,
            todos: healthData.todos,
          },
          blockers: healthData.blockers,
          insights,
        }),
      },
    ],
  };
}
