// Rocks Tools
// Tools for creating, reading, and updating rocks (90-day priorities)

import {
  callSuccessCoGraphQL,
  getLeadershipTeamId,
  getUserContext,
  getDatabase,
  getIsDevMode,
} from "./core.js";
import {
  validateStateId,
  mapRockTypeToLowercase,
  getLastDateOfCurrentQuarter,
} from "../helpers.js";

/**
 * List Success.co rocks
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Rock state filter (defaults to 'ACTIVE')
 * @param {string} [args.rockStatusId] - Rock status filter (defaults to blank)
 * @param {string} [args.userId] - Filter by user ID (rock owner)
 * @param {string} [args.teamId] - Filter by team ID
 * @param {string} [args.keyword] - Search for rocks with names containing this keyword (case-insensitive)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getRocks(args) {
  const {
    first,
    offset,
    stateId = "ACTIVE",
    rockStatusId = "",
    userId,
    teamId: providedTeamId,
    leadershipTeam = false,
    keyword,
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
  // Validate rockStatusId
  if (
    rockStatusId !== "" &&
    !["ONTRACK", "OFFTRACK", "COMPLETE", "INCOMPLETE"].includes(rockStatusId)
  ) {
    return {
      content: [
        {
          type: "text",
          text: "Invalid rock status - must be ONTRACK, OFFTRACK, COMPLETE, or INCOMPLETE",
        },
      ],
    };
  }

  const filterStr = [
    `stateId: {equalTo: "${stateId}"}`,
    rockStatusId ? `rockStatusId: {equalTo: "${rockStatusId}"}` : "",
    userId ? `userId: {equalTo: "${userId}"}` : "",
    keyword ? `name: {includesInsensitive: "${keyword}"}` : "",
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      rocks(${filterStr ? `filter: {${filterStr}}` : ""}) {
        nodes {
          id
          rockStatusId
          name
          desc
          statusUpdatedAt
          type
          dueDate
          createdAt
          stateId
          companyId
          userId
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
  let rocks = data.data.rocks.nodes;

  // If teamId filter is provided, get rocks associated with that team
  if (teamId) {
    const teamsOnRocksQuery = `
      query {
        teamsOnRocks(filter: {teamId: {equalTo: "${teamId}"}, stateId: {equalTo: "${stateId}"}}) {
          nodes {
            rockId
          }
        }
      }
    `;

    const teamsOnRocksResult = await callSuccessCoGraphQL(teamsOnRocksQuery);
    if (teamsOnRocksResult.ok) {
      const teamRockIds = new Set(
        teamsOnRocksResult.data?.data?.teamsOnRocks?.nodes?.map(
          (tr) => tr.rockId
        ) || []
      );
      rocks = rocks.filter((rock) => teamRockIds.has(rock.id));
    }
  }

  // For each rock, get its team associations
  const rockIds = rocks.map((r) => r.id);
  const teamsByRock = {};

  if (rockIds.length > 0) {
    const rockIdsStr = rockIds.map((id) => `"${id}"`).join(", ");
    const teamsOnRocksQuery = `
      query {
        teamsOnRocks(filter: {rockId: {in: [${rockIdsStr}]}, stateId: {equalTo: "${stateId}"}}) {
          nodes {
            rockId
            teamId
          }
        }
      }
    `;

    const teamsOnRocksResult = await callSuccessCoGraphQL(teamsOnRocksQuery);
    if (teamsOnRocksResult.ok) {
      const teamsOnRocks =
        teamsOnRocksResult.data?.data?.teamsOnRocks?.nodes || [];
      teamsOnRocks.forEach((tor) => {
        if (!teamsByRock[tor.rockId]) {
          teamsByRock[tor.rockId] = [];
        }
        teamsByRock[tor.rockId].push(tor.teamId);
      });
    }
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          totalCount: rocks.length,
          results: rocks.map((rock) => ({
            id: rock.id,
            name: rock.name,
            description: rock.desc || "",
            status: rock.rockStatusId,
            type: rock.type,
            dueDate: rock.dueDate,
            createdAt: rock.createdAt,
            statusUpdatedAt: rock.statusUpdatedAt,
            userId: rock.userId,
            teamIds: teamsByRock[rock.id] || [],
          })),
        }),
      },
    ],
  };
}

/**
 * Create a new rock
 * @param {Object} args - Arguments object
 * @param {string} args.name - Rock name/title (required)
 * @param {string} [args.desc] - Rock description
 * @param {string} [args.dueDate] - Due date (YYYY-MM-DD format). If not provided, defaults to the last date of the current quarter based on company's quarter dates.
 * @param {string} [args.teamId] - Team ID to assign the rock to (REQUIRED unless leadershipTeam is true)
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID (REQUIRED unless teamId is provided)
 * @param {string} [args.userId] - User ID to assign the rock to
 * @param {string} [args.type] - Rock type: 'Personal' or 'Company' (defaults to 'Company')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function createRock(args) {
  const {
    name,
    desc = "",
    dueDate: providedDueDate,
    teamId: providedTeamId,
    leadershipTeam = false,
    userId,
    type: providedType = "Company",
  } = args;

  const isDevMode = getIsDevMode();

  // New rocks always start as ONTRACK
  const rockStatusId = "ONTRACK";

  // Map type to lowercase for GraphQL
  const type = mapRockTypeToLowercase(providedType);

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

  // Validate that teamId is provided - rocks MUST be linked to a team
  if (!teamId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Rock must be assigned to a team. Please provide either 'teamId' or set 'leadershipTeam' to true.",
        },
      ],
    };
  }

  if (!name || name.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Error: Rock name is required",
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
  // Use provided userId or default to current user from context
  const finalUserId = userId || context.userId;

  // If dueDate is not provided, calculate the last date of the current quarter
  let dueDate = providedDueDate;
  if (!dueDate) {
    dueDate = await getLastDateOfCurrentQuarter(
      companyId,
      getDatabase(),
      isDevMode
    );
    if (!dueDate) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not determine default due date. Please provide a due date explicitly.",
          },
        ],
      };
    }
    if (isDevMode) {
      console.error(
        `[DEBUG] Using calculated quarter end date as due date: ${dueDate}`
      );
    }
  }

  const mutation = `
    mutation CreateRock($input: CreateRockInput!) {
      createRock(input: $input) {
        rock {
          id
          name
          desc
          rockStatusId
          dueDate
          type
          userId
          user {
            id
            firstName
            lastName
            email
          }
          createdAt
          stateId
          companyId
        }
      }
    }
  `;

  const variables = {
    input: {
      rock: {
        name,
        desc,
        dueDate,
        rockStatusId,
        type,
        companyId,
        userId: finalUserId,
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
          text: `Error creating rock: ${result.error}`,
        },
      ],
    };
  }

  const rock = result.data?.data?.createRock?.rock;

  if (!rock) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Rock creation failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  // If teamId is provided, create the teams_on_rocks links (supports multiple teams)
  if (teamId) {
    // Parse comma-separated teamIds
    const teamIds = teamId
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id);

    if (isDevMode) {
      console.error(
        `[DEBUG] Creating teams_on_rocks links for ${
          teamIds.length
        } team(s): ${teamIds.join(", ")}`
      );
    }

    const linkMutation = `
      mutation CreateTeamsOnRock($input: CreateTeamsOnRockInput!) {
        createTeamsOnRock(input: $input) {
          teamsOnRock {
            id
            teamId
            rockId
            stateId
          }
        }
      }
    `;

    const linkResults = [];
    const failedLinks = [];

    // Create a link for each team
    for (const singleTeamId of teamIds) {
      const linkVariables = {
        input: {
          teamsOnRock: {
            teamId: singleTeamId,
            rockId: rock.id,
            companyId,
            stateId: "ACTIVE",
          },
        },
      };

      const linkResult = await callSuccessCoGraphQL(
        linkMutation,
        linkVariables
      );

      if (
        linkResult.ok &&
        linkResult.data?.data?.createTeamsOnRock?.teamsOnRock
      ) {
        linkResults.push(singleTeamId);
      } else {
        failedLinks.push({
          teamId: singleTeamId,
          error: linkResult.error || "Unknown error",
        });
      }
    }

    // Report results
    if (failedLinks.length > 0) {
      const warningMessage =
        `Rock created successfully but some team assignments failed:\n` +
        `- Successfully linked to: ${linkResults.join(", ")}\n` +
        `- Failed to link to: ${failedLinks
          .map((f) => `${f.teamId} (${f.error})`)
          .join(", ")}\n\n` +
        `Rock details: ${JSON.stringify(rock, null, 2)}`;

      return {
        content: [
          {
            type: "text",
            text: warningMessage,
          },
        ],
      };
    }
  } else {
    if (isDevMode) {
      console.error(
        `[DEBUG] No teamId provided - skipping teams_on_rocks link creation`
      );
    }
  }

  // Build success message
  let message = "Rock created successfully";
  if (teamId) {
    const teamIds = teamId
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id);
    message +=
      teamIds.length > 1
        ? ` and linked to ${teamIds.length} teams (${teamIds.join(", ")})`
        : ` and linked to team ${teamIds[0]}`;
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message,
            rock: {
              id: rock.id,
              name: rock.name,
              desc: rock.desc,
              status: rock.rockStatusId,
              dueDate: rock.dueDate,
              type: rock.type,
              userId: rock.userId,
              createdAt: rock.createdAt,
              stateId: rock.stateId,
              companyId: rock.companyId,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Update an existing rock
 * @param {Object} args - Arguments object
 * @param {string} args.rockId - Rock ID (required)
 * @param {string} [args.name] - Update rock name
 * @param {string} [args.desc] - Update rock description
 * @param {string} [args.status] - Update status ('ONTRACK', 'OFFTRACK', 'COMPLETE', 'INCOMPLETE')
 * @param {string} [args.dueDate] - Update due date
 * @param {string} [args.userId] - Update user assignment
 * @param {string} [args.teamId] - Update team assignment (comma-separated for multiple teams)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateRock(args) {
  const { rockId, name, desc, status, dueDate, userId, teamId } = args;

  const isDevMode = getIsDevMode();

  if (!rockId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Rock ID is required",
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
    mutation UpdateRock($input: UpdateRockInput!) {
      updateRock(input: $input) {
        rock {
          id
          name
          desc
          rockStatusId
          dueDate
          userId
          statusUpdatedAt
          stateId
        }
      }
    }
  `;

  const updates = {};
  if (name) updates.name = name;
  if (desc !== undefined) updates.desc = desc;
  if (status) updates.rockStatusId = status;
  if (dueDate) updates.dueDate = dueDate;
  if (userId) updates.userId = userId;

  // Check if any updates were specified (including teamId)
  if (Object.keys(updates).length === 0 && !teamId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: No updates specified. Provide at least one field to update.",
        },
      ],
    };
  }

  // Update rock properties if any were provided
  let rock = null;
  if (Object.keys(updates).length > 0) {
    const variables = {
      input: {
        id: rockId,
        patch: updates,
      },
    };

    const result = await callSuccessCoGraphQL(mutation, variables);

    if (!result.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error updating rock: ${result.error}`,
          },
        ],
      };
    }

    rock = result.data?.data?.updateRock?.rock;

    if (!rock) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Rock update failed. ${JSON.stringify(
              result.data,
              null,
              2
            )}`,
          },
        ],
      };
    }
  }

  // Track team assignment changes for reporting
  let reactivatedLinks = [];

  // Handle team assignment updates if teamId is provided
  if (teamId) {
    if (isDevMode) {
      console.error(
        `[DEBUG] Starting team assignment update for rock ${rockId} with teamId: ${teamId}`
      );
    }

    // Get company ID for team operations
    const context = await getContextForApiKey(apiKey);
    if (!context) {
      if (isDevMode) {
        console.error(`[DEBUG] Failed to get context for API key`);
      }
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not determine company context for team assignment update.",
          },
        ],
      };
    }
    const companyId = context.companyId;

    if (isDevMode) {
      console.error(`[DEBUG] Got company ID: ${companyId}`);
    }

    // Parse comma-separated teamIds
    const teamIds = teamId
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id);

    if (isDevMode) {
      console.error(
        `[DEBUG] Parsed ${teamIds.length} team IDs: ${teamIds.join(", ")}`
      );
    }

    // First, get all existing teams_on_rocks links for this rock (including deleted ones)
    const existingQuery = `
      query GetTeamsOnRocks($rockId: UUID!) {
        teamsOnRocks(filter: {rockId: {equalTo: $rockId}}) {
          nodes {
            id
            teamId
            stateId
          }
        }
      }
    `;

    const existingLinks = await callSuccessCoGraphQL(existingQuery, { rockId });

    if (!existingLinks.ok) {
      if (isDevMode) {
        console.error(
          `[DEBUG] Failed to query existing teams_on_rocks: ${existingLinks.error}`
        );
      }
      return {
        content: [
          {
            type: "text",
            text: `Error querying existing team assignments: ${existingLinks.error}`,
          },
        ],
      };
    }

    // Build a map of existing links by teamId
    const existingLinksMap = new Map();
    if (existingLinks.data?.data?.teamsOnRocks?.nodes) {
      existingLinks.data.data.teamsOnRocks.nodes.forEach((node) => {
        existingLinksMap.set(node.teamId, {
          id: node.id,
          stateId: node.stateId,
        });
      });

      if (isDevMode) {
        console.error(
          `[DEBUG] Found ${existingLinksMap.size} existing team links`
        );
      }
    }

    // Soft delete (mark as DELETED) any existing ACTIVE links that are not in the new teamIds list
    const updateMutation = `
      mutation UpdateTeamsOnRock($input: UpdateTeamsOnRockInput!) {
        updateTeamsOnRock(input: $input) {
          teamsOnRock {
            id
            teamId
            stateId
          }
        }
      }
    `;

    for (const [existingTeamId, linkInfo] of existingLinksMap.entries()) {
      // If this team is not in the new list and is currently ACTIVE, mark as DELETED
      if (!teamIds.includes(existingTeamId) && linkInfo.stateId === "ACTIVE") {
        if (isDevMode) {
          console.error(
            `[DEBUG] Soft deleting team link for team ${existingTeamId} (id: ${linkInfo.id})`
          );
        }

        const softDeleteResult = await callSuccessCoGraphQL(updateMutation, {
          input: {
            id: linkInfo.id,
            patch: { stateId: "DELETED" },
          },
        });

        if (!softDeleteResult.ok) {
          if (isDevMode) {
            console.error(
              `[DEBUG] Failed to soft delete team link ${linkInfo.id}: ${softDeleteResult.error}`
            );
          }
          return {
            content: [
              {
                type: "text",
                text: `Error soft deleting existing team assignment: ${softDeleteResult.error}`,
              },
            ],
          };
        }

        if (isDevMode) {
          console.error(
            `[DEBUG] Successfully soft deleted team link ${linkInfo.id}`
          );
        }
      }
    }

    // Create new team assignments
    const createMutation = `
      mutation CreateTeamsOnRock($input: CreateTeamsOnRockInput!) {
        createTeamsOnRock(input: $input) {
          teamsOnRock {
            id
            teamId
            rockId
            stateId
          }
        }
      }
    `;

    const linkResults = [];
    const failedLinks = [];

    for (const singleTeamId of teamIds) {
      const existingLink = existingLinksMap.get(singleTeamId);

      // If link already exists and is ACTIVE, skip it
      if (existingLink && existingLink.stateId === "ACTIVE") {
        if (isDevMode) {
          console.error(
            `[DEBUG] Team link for ${singleTeamId} is already ACTIVE, skipping`
          );
        }
        linkResults.push(singleTeamId);
        continue;
      }

      // If link exists but is DELETED, reactivate it
      if (existingLink && existingLink.stateId === "DELETED") {
        if (isDevMode) {
          console.error(
            `[DEBUG] Reactivating team link for team: ${singleTeamId} (id: ${existingLink.id})`
          );
        }

        const reactivateResult = await callSuccessCoGraphQL(updateMutation, {
          input: {
            id: existingLink.id,
            patch: { stateId: "ACTIVE" },
          },
        });

        if (
          reactivateResult.ok &&
          reactivateResult.data?.data?.updateTeamsOnRock?.teamsOnRock
        ) {
          linkResults.push(singleTeamId);
          reactivatedLinks.push(singleTeamId);
          if (isDevMode) {
            console.error(
              `[DEBUG] Successfully reactivated team link for ${singleTeamId}`
            );
          }
        } else {
          const error = reactivateResult.error || "Unknown error";
          failedLinks.push({
            teamId: singleTeamId,
            error,
          });
          if (isDevMode) {
            console.error(
              `[DEBUG] Failed to reactivate team link for ${singleTeamId}: ${error}`
            );
          }
        }
        continue;
      }

      // Link doesn't exist, create a new one
      if (isDevMode) {
        console.error(
          `[DEBUG] Creating new team link for team: ${singleTeamId}`
        );
      }

      const linkVariables = {
        input: {
          teamsOnRock: {
            teamId: singleTeamId,
            rockId: rockId,
            companyId,
            stateId: "ACTIVE",
          },
        },
      };

      const linkResult = await callSuccessCoGraphQL(
        createMutation,
        linkVariables
      );

      if (
        linkResult.ok &&
        linkResult.data?.data?.createTeamsOnRock?.teamsOnRock
      ) {
        linkResults.push(singleTeamId);
        if (isDevMode) {
          console.error(
            `[DEBUG] Successfully created team link for ${singleTeamId}`
          );
        }
      } else {
        const error = linkResult.error || "Unknown error";
        failedLinks.push({
          teamId: singleTeamId,
          error,
        });
        if (isDevMode) {
          console.error(
            `[DEBUG] Failed to create team link for ${singleTeamId}: ${error}`
          );
        }
      }
    }

    if (isDevMode) {
      console.error(
        `[DEBUG] Team assignment complete: ${linkResults.length} succeeded, ${failedLinks.length} failed`
      );
    }

    // Report partial failures
    if (failedLinks.length > 0 && linkResults.length > 0) {
      const warningMessage =
        `Rock updated but some team assignments failed:\n` +
        `- Successfully linked to: ${linkResults.join(", ")}\n` +
        `- Failed to link to: ${failedLinks
          .map((f) => `${f.teamId} (${f.error})`)
          .join(", ")}`;

      return {
        content: [
          {
            type: "text",
            text: warningMessage,
          },
        ],
      };
    } else if (failedLinks.length === teamIds.length) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Rock updated but all team assignments failed: ${failedLinks
              .map((f) => `${f.teamId} (${f.error})`)
              .join(", ")}`,
          },
        ],
      };
    }
  }

  // Build success message
  let message = "Rock updated successfully";
  if (teamId) {
    const teamIds = teamId
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id);

    // Add detail about what happened with teams
    const details = [];
    if (teamIds.length > 1) {
      details.push(`reassigned to ${teamIds.length} teams`);
    } else {
      details.push(`reassigned to team ${teamIds[0]}`);
    }

    if (reactivatedLinks && reactivatedLinks.length > 0) {
      details.push(
        `${reactivatedLinks.length} team link(s) reactivated from DELETED`
      );
    }

    message += ` (${details.join(", ")})`;
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message,
            rock: rock
              ? {
                  id: rock.id,
                  name: rock.name,
                  desc: rock.desc,
                  status: rock.rockStatusId,
                  dueDate: rock.dueDate,
                  userId: rock.userId,
                  statusUpdatedAt: rock.statusUpdatedAt,
                  stateId: rock.stateId,
                }
              : { id: rockId },
          },
          null,
          2
        ),
      },
    ],
  };
}
