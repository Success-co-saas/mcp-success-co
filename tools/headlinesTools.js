// Headlines Tools
// Tools for creating, reading, and updating headlines (weekly news/updates)

import {
  callSuccessCoGraphQL,
  getLeadershipTeamId,
  getUserContext,
} from "./core.js";
import { validateStateId } from "../helpers.js";
import { getCompanyCode, generateObjectUrl } from "./commonHelpers.js";

/**
 * List Success.co headlines
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Headline state filter (defaults to 'ACTIVE')
 * @param {string} [args.headlineId] - Filter by specific headline ID
 * @param {string} [args.teamId] - Filter by team ID
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID for filtering
 * @param {string} [args.userId] - Filter by user ID (headline owner)
 * @param {boolean} [args.fromMeetings] - If true, only show headlines created from meetings
 * @param {string} [args.createdAfter] - Filter headlines created after this date (ISO format)
 * @param {string} [args.createdBefore] - Filter headlines created before this date (ISO format)
 * @param {string} [args.keyword] - Search for headlines containing this keyword (case-insensitive)
 * @param {string} [args.status] - Filter by status: 'Shared' or 'Not shared' (defaults to 'Not shared')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getHeadlines(args) {
  const {
    first,
    offset,
    stateId = "ACTIVE",
    headlineId,
    teamId: providedTeamId,
    leadershipTeam = false,
    userId,
    fromMeetings = false,
    createdAfter,
    createdBefore,
    keyword,
    status = "Not shared",
  } = args;

  // Map external status values to internal database values
  const statusMapping = {
    Shared: "DISCUSSED",
    "Not shared": "DISCUSS",
  };
  const internalStatus = statusMapping[status];

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

  const filterItems = [`stateId: {equalTo: "${stateId}"}`];

  // Add headlineId filter if provided
  if (headlineId) {
    filterItems.push(`id: {equalTo: "${headlineId}"}`);
  }

  // Add teamId filter if provided
  if (teamId) {
    filterItems.push(`teamId: {equalTo: "${teamId}"}`);
  }

  // Add userId filter if provided
  if (userId) {
    filterItems.push(`userId: {equalTo: "${userId}"}`);
  }

  // Add status filter if provided
  if (internalStatus) {
    filterItems.push(`headlineStatusId: {equalTo: "${internalStatus}"}`);
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

  // Note: keyword filtering will be done post-query as GraphQL doesn't support LIKE/ILIKE easily
  const filterStr = [
    filterItems.length > 0 ? `filter: {${filterItems.join(", ")}}` : "",
    first !== undefined && !keyword ? `first: ${first}` : "",
    offset !== undefined && !keyword ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      headlines(${filterStr}) {
        nodes {
          id
          name
          desc
          userId
          teamId
          headlineStatusId
          statusUpdatedAt
          meetingId
          createdAt
          stateId
          companyId
          isCascadingMessage
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  let headlines = result.data.data.headlines.nodes;

  // Apply keyword filtering if provided
  if (keyword) {
    const lowerKeyword = keyword.toLowerCase();
    headlines = headlines.filter(
      (h) =>
        (h.name && h.name.toLowerCase().includes(lowerKeyword)) ||
        (h.desc && h.desc.toLowerCase().includes(lowerKeyword))
    );

    // Apply pagination after filtering if keyword is used
    const start = offset || 0;
    const end = first ? start + first : headlines.length;
    headlines = headlines.slice(start, end);
  }

  // Map internal status values back to external values
  const externalStatusMapping = {
    DISCUSSED: "Shared",
    DISCUSS: "Not shared",
  };

  // Get company code for URL generation
  const context = await getUserContext();
  const companyCode = context ? await getCompanyCode(context.companyId) : null;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          totalCount: headlines.length,
          results: headlines.map((headline) => ({
            id: headline.id,
            name: headline.name,
            description: headline.desc || "",
            status:
              externalStatusMapping[headline.headlineStatusId] ||
              headline.headlineStatusId,
            teamId: headline.teamId,
            userId: headline.userId,
            meetingId: headline.meetingId,
            isCascadingMessage: headline.isCascadingMessage,
            createdAt: headline.createdAt,
            statusUpdatedAt: headline.statusUpdatedAt,
            url: companyCode ? generateObjectUrl('headlines', headline.id, companyCode) : null,
          })),
        }),
      },
    ],
  };
}

/**
 * Create a new headline
 * @param {Object} args - Arguments object
 * @param {string} args.name - Headline text (required)
 * @param {string} [args.desc] - Headline description/details
 * @param {string} [args.teamId] - Team ID to associate with (required if leadershipTeam is false)
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID (required if teamId not provided)
 * @param {string} [args.userId] - User ID to associate with
 * @param {string} [args.status] - Headline status: 'Shared' or 'Not shared' (defaults to 'Not shared')
 * @param {boolean} [args.isCascadingMessage] - Whether this is a cascading message (defaults to false)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function createHeadline(args) {
  const {
    name,
    desc = "",
    teamId: providedTeamId,
    leadershipTeam = false,
    userId,
    status = "Not shared",
    isCascadingMessage = false,
  } = args;

  // Map external status values to internal database values
  const statusMapping = {
    Shared: "DISCUSSED",
    "Not shared": "DISCUSS",
  };
  const headlineStatusId = statusMapping[status] || "DISCUSS";

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

  // Validate that teamId is provided - headlines MUST be linked to a team
  if (!teamId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Headline must be assigned to a team. Please provide either 'teamId' or set 'leadershipTeam' to true.",
        },
      ],
    };
  }

  if (!name || name.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Error: Headline text is required",
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

  const mutation = `
    mutation CreateHeadline($input: CreateHeadlineInput!) {
      createHeadline(input: $input) {
        headline {
          id
          name
          desc
          headlineStatusId
          teamId
          userId
          isCascadingMessage
          createdAt
          stateId
          companyId
        }
      }
    }
  `;

  const variables = {
    input: {
      headline: {
        name,
        desc,
        headlineStatusId,
        isCascadingMessage,
        companyId,
        ...(teamId && { teamId }),
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
          text: `Error creating headline: ${result.error}`,
        },
      ],
    };
  }

  const headline = result.data?.data?.createHeadline?.headline;

  if (!headline) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Headline creation failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  // Map internal status back to external value
  const externalStatusMapping = {
    DISCUSSED: "Shared",
    DISCUSS: "Not shared",
  };

  // Get company code for URL generation
  const companyCode = await getCompanyCode(companyId);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: "Headline created successfully",
            headline: {
              ...headline,
              headlineStatusId:
                externalStatusMapping[headline.headlineStatusId] ||
                headline.headlineStatusId,
              url: companyCode ? generateObjectUrl('headlines', headline.id, companyCode) : null,
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
 * Update an existing headline
 * @param {Object} args - Arguments object
 * @param {string} args.headlineId - Headline ID (required)
 * @param {string} [args.name] - Update headline text
 * @param {string} [args.desc] - Update headline description
 * @param {string} [args.status] - Update status: 'Shared' or 'Not shared'
 * @param {string} [args.teamId] - Update team assignment
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID for assignment
 * @param {string} [args.userId] - Update user assignment
 * @param {boolean} [args.isCascadingMessage] - Update cascading message flag
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateHeadline(args) {
  const {
    headlineId,
    name,
    desc,
    status,
    teamId: providedTeamId,
    leadershipTeam = false,
    userId,
    isCascadingMessage,
  } = args;

  // Map external status values to internal database values
  const statusMapping = {
    Shared: "DISCUSSED",
    "Not shared": "DISCUSS",
  };
  const internalStatus = status ? statusMapping[status] : undefined;

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

  if (!headlineId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Headline ID is required",
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
    mutation UpdateHeadline($input: UpdateHeadlineInput!) {
      updateHeadline(input: $input) {
        headline {
          id
          name
          desc
          headlineStatusId
          teamId
          userId
          isCascadingMessage
          statusUpdatedAt
          stateId
        }
      }
    }
  `;

  const updates = {};
  if (name) updates.name = name;
  if (desc !== undefined) updates.desc = desc;
  if (internalStatus) updates.headlineStatusId = internalStatus;
  if (teamId) updates.teamId = teamId;
  if (userId) updates.userId = userId;
  if (isCascadingMessage !== undefined)
    updates.isCascadingMessage = isCascadingMessage;

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
      id: headlineId,
      patch: updates,
    },
  };

  const result = await callSuccessCoGraphQL(mutation, variables);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error updating headline: ${result.error}`,
        },
      ],
    };
  }

  const headline = result.data?.data?.updateHeadline?.headline;

  if (!headline) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Headline update failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  // Map internal status back to external value
  const externalStatusMapping = {
    DISCUSSED: "Shared",
    DISCUSS: "Not shared",
  };

  // Get company code for URL generation (context already declared at top of function)
  const companyCode = context ? await getCompanyCode(context.companyId) : null;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: "Headline updated successfully",
            headline: {
              ...headline,
              headlineStatusId:
                externalStatusMapping[headline.headlineStatusId] ||
                headline.headlineStatusId,
              url: companyCode ? generateObjectUrl('headlines', headline.id, companyCode) : null,
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
 * Delete a headline in Success.co
 * @param {Object} args - Arguments object
 * @param {string} args.headlineId - Headline ID (required)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function deleteHeadline(args) {
  const { headlineId } = args;

  if (!headlineId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: headlineId is required",
        },
      ],
    };
  }

  const mutation = `
    mutation {
      updateHeadline(input: {
        id: "${headlineId}",
        patch: {
          stateId: "DELETED"
        }
      }) {
        headline {
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

  const headline = result.data?.data?.updateHeadline?.headline;

  if (!headline) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Headline deletion failed. ${JSON.stringify(result.data, null, 2)}`,
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
            message: `Headline deleted successfully`,
            headline: {
              id: headline.id,
              name: headline.name,
              status: headline.stateId,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}
