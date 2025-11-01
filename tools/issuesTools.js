// Issues Tools
// Tools for creating, reading, and updating issues

import {
  callSuccessCoGraphQL,
  getLeadershipTeamId,
  getUserContext,
} from "./core.js";
import {
  validateStateId,
  mapPriorityToNumber,
  mapPriorityToText,
  mapIssueTypeToLowercase,
} from "../helpers.js";

/**
 * List Success.co issues
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Issue state filter (defaults to 'ACTIVE')
 * @param {string} [args.teamId] - Filter by team ID
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID for filtering
 * @param {string} [args.userId] - Filter by user ID (issue owner)
 * @param {string} [args.status] - Filter by status: 'TODO', 'COMPLETE', or 'ALL'
 * @param {string} [args.type] - Filter by type: 'Short-term', 'Long-term', or 'ALL'
 * @param {boolean} [args.fromMeetings] - If true, only show issues created from meetings
 * @param {string} [args.keyword] - Search for issues with names containing this keyword (case-insensitive)
 * @param {string} [args.createdAfter] - Filter issues created after this date (ISO format)
 * @param {string} [args.createdBefore] - Filter issues created before this date (ISO format)
 * @param {string} [args.statusUpdatedBefore] - Filter issues with status updated before this date (ISO format)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getIssues(args) {
  const {
    first,
    offset,
    stateId = "ACTIVE",
    teamId: providedTeamId,
    leadershipTeam = false,
    userId,
    status = "TODO",
    type = "Short-term",
    fromMeetings = false,
    keyword,
    createdAfter,
    createdBefore,
    statusUpdatedBefore,
  } = args;

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
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  // Validate status if provided
  if (status && !["TODO", "COMPLETE", "ALL"].includes(status)) {
    return {
      content: [
        {
          type: "text",
          text: 'Invalid status - must be "TODO", "COMPLETE", or "ALL"',
        },
      ],
    };
  }

  // Validate type if provided
  if (type && !["Short-term", "Long-term", "ALL"].includes(type)) {
    return {
      content: [
        {
          type: "text",
          text: 'Invalid type - must be "Short-term", "Long-term", or "ALL"',
        },
      ],
    };
  }

  const filterItems = [`stateId: {equalTo: "${stateId}"}`];

  // Add teamId filter if provided
  if (teamId) {
    filterItems.push(`teamId: {equalTo: "${teamId}"}`);
  }

  // Add userId filter if provided
  if (userId) {
    filterItems.push(`userId: {equalTo: "${userId}"}`);
  }

  // Add keyword filter if provided
  if (keyword) {
    filterItems.push(`name: {includesInsensitive: "${keyword}"}`);
  }

  // Add status filter if provided (skip if "ALL")
  if (status && status !== "ALL") {
    filterItems.push(`issueStatusId: {equalTo: "${status}"}`);
  }

  // Add type filter if provided (skip if "ALL")
  if (type && type !== "ALL") {
    filterItems.push(`type: {equalTo: "${type.toLowerCase()}"}`);
  }

  // Add meetingId filter if fromMeetings is true
  if (fromMeetings) {
    filterItems.push(`meetingId: {isNull: false}`);
  }

  // Add date filters
  if (createdAfter) {
    filterItems.push(`createdAt: {greaterThanOrEqualTo: "${createdAfter}"}`);
  }
  if (createdBefore) {
    filterItems.push(`createdAt: {lessThanOrEqualTo: "${createdBefore}"}`);
  }
  if (statusUpdatedBefore) {
    filterItems.push(
      `statusUpdatedAt: {lessThanOrEqualTo: "${statusUpdatedBefore}"}`
    );
  }

  const filterStr = [
    filterItems.length > 0 ? `filter: {${filterItems.join(", ")}}` : "",
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      issues(${filterStr}) {
        nodes {
          id
          issueStatusId
          name
          desc
          teamId
          userId
          type
          priorityNo
          priorityOrder
          statusUpdatedAt
          meetingId
          createdAt
          stateId
          companyId
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const data = result.data;
  const issues = data.data.issues.nodes;

  // Calculate summary statistics
  const summary = {
    totalCount: data.data.issues.totalCount,
    todoCount: issues.filter(i => i.issueStatusId === 'TODO').length,
    completeCount: issues.filter(i => i.issueStatusId === 'COMPLETE').length,
  };

  // Calculate stuck issues (status not updated in 30+ days and still TODO)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  summary.stuckCount = issues.filter(i => 
    i.issueStatusId === 'TODO' && 
    new Date(i.statusUpdatedAt) < thirtyDaysAgo
  ).length;

  // Count high priority issues
  summary.highPriorityCount = issues.filter(i => 
    i.issueStatusId === 'TODO' && 
    i.priorityNo <= 1
  ).length;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          summary,
          results: issues.map((issue) => ({
            id: issue.id,
            name: issue.name,
            description: issue.desc || "",
            status: issue.issueStatusId,
            type: issue.type
              ? issue.type.charAt(0).toUpperCase() + issue.type.slice(1)
              : null,
            priority: mapPriorityToText(issue.priorityNo),
            priorityOrder: issue.priorityOrder,
            teamId: issue.teamId,
            userId: issue.userId,
            meetingId: issue.meetingId,
            createdAt: issue.createdAt,
            statusUpdatedAt: issue.statusUpdatedAt,
          })),
        }),
      },
    ],
  };
}

/**
 * Create a new issue
 * @param {Object} args - Arguments object
 * @param {string} args.name - Issue name/title (required)
 * @param {string} [args.teamId] - Team ID to assign the issue to (REQUIRED unless leadershipTeam is true)
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID (REQUIRED unless teamId is provided)
 * @param {string} [args.desc] - Issue description
 * @param {string} [args.userId] - User ID to assign the issue to
 * @param {string} [args.priority] - Priority level: 'High', 'Medium', 'Low', or 'No priority' (defaults to 'Medium')
 * @param {string} [args.type] - Issue type: 'Short-term' or 'Long-term' (defaults to 'Short-term')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function createIssue(args) {
  const {
    name,
    teamId: providedTeamId,
    leadershipTeam = false,
    desc = "",
    userId: providedUserId,
    priority = "Medium",
    type: providedType = "Short-term",
  } = args;

  // Map priority string to numeric value for GraphQL
  const priorityNo = mapPriorityToNumber(priority);

  // Map type to lowercase for GraphQL
  const type = mapIssueTypeToLowercase(providedType);

  // Always set issueStatusId to TODO for new issues
  const issueStatusId = "TODO";

  if (!name || name.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Error: Issue name is required",
        },
      ],
    };
  }

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

  if (!teamId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Team ID is required. Either provide teamId or set leadershipTeam to true.",
        },
      ],
    };
  }

  // Get user context (works with OAuth or API key)
  const context = await getUserContext();
  if (!context) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Authentication required. No valid OAuth token or API key found.",
        },
      ],
    };
  }

  const companyId = context.companyId;
  const userId = providedUserId || context.userId; // Use provided userId or default to current user

  const mutation = `
    mutation CreateIssue($input: CreateIssueInput!) {
      createIssue(input: $input) {
        issue {
          id
          name
          desc
          issueStatusId
          teamId
          userId
          type
          priorityNo
          createdAt
          stateId
          companyId
        }
      }
    }
  `;

  const variables = {
    input: {
      issue: {
        name,
        desc,
        issueStatusId,
        priorityNo,
        type,
        teamId,
        userId,
        companyId,
        stateId: "ACTIVE",
      },
    },
  };

  const result = await callSuccessCoGraphQL(mutation, variables);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error creating issue: ${result.error}`,
        },
      ],
    };
  }

  const issue = result.data?.data?.createIssue?.issue;

  if (!issue) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Issue creation failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: "Issue created successfully",
            issue: issue,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Update an existing issue
 * @param {Object} args - Arguments object
 * @param {string} args.issueId - Issue ID (required)
 * @param {string} [args.name] - Update issue name
 * @param {string} [args.desc] - Update issue description
 * @param {string} [args.issueStatusId] - Update status: 'TODO' or 'COMPLETE'
 * @param {string} [args.teamId] - Update team assignment
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID for assignment
 * @param {string} [args.userId] - Update user assignment
 * @param {string} [args.priority] - Update priority level: 'High', 'Medium', 'Low', or 'No priority'
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateIssue(args) {
  const {
    issueId,
    name,
    desc,
    issueStatusId,
    teamId: providedTeamId,
    leadershipTeam = false,
    userId,
    priority,
  } = args;

  // Map priority string to numeric value for GraphQL if priority is provided
  const priorityNo =
    priority !== undefined ? mapPriorityToNumber(priority) : undefined;

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

  if (!issueId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Issue ID is required",
        },
      ],
    };
  }

  // Get user context (works with OAuth or API key)
  const context = await getUserContext();
  if (!context) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Authentication required. No valid OAuth token or API key found.",
        },
      ],
    };
  }

  const mutation = `
    mutation UpdateIssue($input: UpdateIssueInput!) {
      updateIssue(input: $input) {
        issue {
          id
          name
          desc
          issueStatusId
          teamId
          userId
          priorityNo
          statusUpdatedAt
          stateId
        }
      }
    }
  `;

  const updates = {};
  if (name) updates.name = name;
  if (desc !== undefined) updates.desc = desc;
  if (issueStatusId) updates.issueStatusId = issueStatusId;
  if (teamId) updates.teamId = teamId;
  if (userId) updates.userId = userId;
  if (priorityNo !== undefined) updates.priorityNo = priorityNo;

  if (Object.keys(updates).length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "Error: No updates specified. Provide at least one field to update.",
        },
      ],
    };
  }

  const variables = {
    input: {
      id: issueId,
      patch: updates,
    },
  };

  const result = await callSuccessCoGraphQL(mutation, variables);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error updating issue: ${result.error}`,
        },
      ],
    };
  }

  const issue = result.data?.data?.updateIssue?.issue;

  if (!issue) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Issue update failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: "Issue updated successfully",
            issue: issue,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Delete an issue in Success.co
 * @param {Object} args - Arguments object
 * @param {string} args.issueId - Issue ID (required)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function deleteIssue(args) {
  const { issueId } = args;

  if (!issueId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: issueId is required",
        },
      ],
    };
  }

  const mutation = `
    mutation {
      updateIssue(input: {
        id: "${issueId}",
        patch: {
          stateId: "DELETED"
        }
      }) {
        issue {
          id
          name
          stateId
        }
      }
    }
  `;

  const result = await callSuccessCoGraphQL(mutation);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const issue = result.data?.data?.updateIssue?.issue;

  if (!issue) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Issue deletion failed. ${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: `Issue deleted successfully`,
            issue: {
              id: issue.id,
              name: issue.name,
              status: issue.stateId,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}
