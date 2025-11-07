// Milestones Tools
// Tools for working with rock milestones

import {
  callSuccessCoGraphQL,
  getLeadershipTeamId,
  getUserContext,
  getAuthContext,
} from "./core.js";
import { validateStateId } from "../helpers.js";
import { getCompanyCode, generateObjectUrl } from "./commonHelpers.js";

/**
 * List Success.co milestones
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Milestone state filter (defaults to 'ACTIVE')
 * @param {string} [args.rockId] - Filter by rock ID
 * @param {string} [args.userId] - Filter by user ID
 * @param {string} [args.teamId] - Filter by team ID
 * @param {string} [args.keyword] - Search for milestones with names containing this keyword (case-insensitive)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getMilestones(args) {
  const {
    first,
    offset,
    stateId = "ACTIVE",
    rockId,
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

  // Build filter parameters (inside filter object)
  const filterParts = [`stateId: {equalTo: "${stateId}"}`];
  if (rockId) filterParts.push(`rockId: {equalTo: "${rockId}"}`);
  if (userId) filterParts.push(`userId: {equalTo: "${userId}"}`);
  if (teamId) filterParts.push(`teamId: {equalTo: "${teamId}"}`);
  if (keyword) filterParts.push(`name: {includesInsensitive: "${keyword}"}`);

  const filterStr = filterParts.join(", ");

  // Build query-level parameters (outside filter object)
  const queryParams = [
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
    `filter: {${filterStr}}`,
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      milestones(${queryParams}) {
        nodes {
          id
          rockId
          name
          dueDate
          userId
          milestoneStatusId
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

  // Get company code for URL generation
  const context = await getUserContext();
  const companyCode = context ? await getCompanyCode(context.companyId) : null;

  // Get current user context
  const auth = getAuthContext();
  const currentUserId = auth && !auth.isApiKeyMode ? auth.userId : null;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          totalCount: data.data.milestones.totalCount,
          currentUserId,
          results: data.data.milestones.nodes.map((milestone) => ({
            id: milestone.id,
            rockId: milestone.rockId,
            name: milestone.name,
            dueDate: milestone.dueDate,
            userId: milestone.userId,
            milestoneStatusId: milestone.milestoneStatusId,
            createdAt: milestone.createdAt,
            status: milestone.stateId,
            // Milestones are viewed within their parent rock, so link to the rock
            url: companyCode ? generateObjectUrl('rocks', milestone.rockId, companyCode) : null,
          })),
        }),
      },
    ],
  };
}

/**
 * Create a new milestone in Success.co
 * @param {Object} args - Arguments object
 * @param {string} args.name - Milestone name (required)
 * @param {string} args.rockId - Rock ID (required)
 * @param {string} [args.dueDate] - Due date (YYYY-MM-DD format)
 * @param {string} [args.userId] - User ID to assign the milestone to
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function createMilestone(args) {
  const { name, rockId, dueDate, userId: providedUserId } = args;

  if (!name) {
    return {
      content: [{ type: "text", text: "Error: name is required" }],
    };
  }

  if (!rockId) {
    return {
      content: [{ type: "text", text: "Error: rockId is required" }],
    };
  }

  // Get user context for userId and companyId
  const userContext = await getUserContext();
  const userId = providedUserId || userContext.userId;
  const companyId = userContext.companyId;

  // If dueDate is not provided, default to 30 days from now
  let finalDueDate = dueDate;
  if (!finalDueDate) {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    finalDueDate = defaultDate.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  const mutation = `
    mutation {
      createMilestone(input: {
        milestone: {
          name: "${name}"
          rockId: "${rockId}"
          dueDate: "${finalDueDate}"
          companyId: "${companyId}"
          ${userId ? `userId: "${userId}"` : ""}
          stateId: "ACTIVE"
          milestoneStatusId: "TODO"
        }
      }) {
        milestone {
          id
          name
          rockId
          dueDate
          userId
          milestoneStatusId
          createdAt
          stateId
        }
      }
    }
  `;

  const result = await callSuccessCoGraphQL(mutation);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const createdMilestone = result.data?.data?.createMilestone?.milestone;

  if (!createdMilestone) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Milestone creation failed. ${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }

  // Re-fetch the milestone to return it in the same format as getMilestones
  const fetchQuery = `
    query {
      milestones(filter: {id: {equalTo: "${createdMilestone.id}"}}) {
        nodes {
          id
          rockId
          name
          dueDate
          userId
          milestoneStatusId
          createdAt
          stateId
          companyId
        }
      }
    }
  `;

  const fetchResult = await callSuccessCoGraphQL(fetchQuery);
  const context = await getUserContext();
  const companyCode = context ? await getCompanyCode(context.companyId) : null;

  if (!fetchResult.ok || !fetchResult.data?.data?.milestones?.nodes?.[0]) {
    // Fallback to created data if re-fetch fails
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              message: "Milestone created successfully",
              milestone: {
                id: createdMilestone.id,
                rockId: createdMilestone.rockId,
                name: createdMilestone.name,
                dueDate: createdMilestone.dueDate,
                userId: createdMilestone.userId,
                milestoneStatusId: createdMilestone.milestoneStatusId,
                createdAt: createdMilestone.createdAt,
                status: createdMilestone.stateId,
                url: companyCode ? generateObjectUrl('rocks', createdMilestone.rockId, companyCode) : null,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  const milestone = fetchResult.data.data.milestones.nodes[0];

  // Return in same format as getMilestones
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: "Milestone created successfully",
            milestone: {
              id: milestone.id,
              rockId: milestone.rockId,
              name: milestone.name,
              dueDate: milestone.dueDate,
              userId: milestone.userId,
              milestoneStatusId: milestone.milestoneStatusId,
              createdAt: milestone.createdAt,
              status: milestone.stateId,
              url: companyCode ? generateObjectUrl('rocks', milestone.rockId, companyCode) : null,
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
 * Update a milestone in Success.co
 * @param {Object} args - Arguments object
 * @param {string} args.milestoneId - Milestone ID (required)
 * @param {string} [args.name] - Update milestone name
 * @param {string} [args.dueDate] - Update due date (YYYY-MM-DD format)
 * @param {string} [args.userId] - Update user assignment
 * @param {string} [args.milestoneStatusId] - Update status: "TODO" or "COMPLETE"
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateMilestone(args) {
  const { milestoneId, name, dueDate, userId, milestoneStatusId } = args;

  if (!milestoneId) {
    return {
      content: [{ type: "text", text: "Error: milestoneId is required" }],
    };
  }

  // Build patch object with only provided fields
  const patchFields = [];
  if (name !== undefined) patchFields.push(`name: "${name}"`);
  if (dueDate !== undefined) patchFields.push(`dueDate: "${dueDate}"`);
  if (userId !== undefined) patchFields.push(`userId: "${userId}"`);
  if (milestoneStatusId !== undefined)
    patchFields.push(`milestoneStatusId: "${milestoneStatusId}"`);

  if (patchFields.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "Error: At least one field to update must be provided (name, dueDate, userId, or milestoneStatusId)",
        },
      ],
    };
  }

  const mutation = `
    mutation {
      updateMilestone(input: {
        id: "${milestoneId}",
        patch: {
          ${patchFields.join("\n          ")}
        }
      }) {
        milestone {
          id
          name
          rockId
          dueDate
          userId
          milestoneStatusId
          stateId
        }
      }
    }
  `;

  const result = await callSuccessCoGraphQL(mutation);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const updatedMilestone = result.data?.data?.updateMilestone?.milestone;

  if (!updatedMilestone) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Milestone update failed. ${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }

  // Re-fetch the milestone to return it in the same format as getMilestones
  const fetchQuery = `
    query {
      milestones(filter: {id: {equalTo: "${milestoneId}"}}) {
        nodes {
          id
          rockId
          name
          dueDate
          userId
          milestoneStatusId
          createdAt
          stateId
          companyId
        }
      }
    }
  `;

  const fetchResult = await callSuccessCoGraphQL(fetchQuery);
  const context = await getUserContext();
  const companyCode = context ? await getCompanyCode(context.companyId) : null;

  if (!fetchResult.ok || !fetchResult.data?.data?.milestones?.nodes?.[0]) {
    // Fallback to updated data if re-fetch fails
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              message: "Milestone updated successfully",
              milestone: {
                id: updatedMilestone.id,
                rockId: updatedMilestone.rockId,
                name: updatedMilestone.name,
                dueDate: updatedMilestone.dueDate,
                userId: updatedMilestone.userId,
                milestoneStatusId: updatedMilestone.milestoneStatusId,
                createdAt: updatedMilestone.createdAt,
                status: updatedMilestone.stateId,
                url: companyCode ? generateObjectUrl('rocks', updatedMilestone.rockId, companyCode) : null,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  const milestone = fetchResult.data.data.milestones.nodes[0];

  // Return in same format as getMilestones
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: "Milestone updated successfully",
            milestone: {
              id: milestone.id,
              rockId: milestone.rockId,
              name: milestone.name,
              dueDate: milestone.dueDate,
              userId: milestone.userId,
              milestoneStatusId: milestone.milestoneStatusId,
              createdAt: milestone.createdAt,
              status: milestone.stateId,
              url: companyCode ? generateObjectUrl('rocks', milestone.rockId, companyCode) : null,
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
 * Delete a milestone in Success.co
 * @param {Object} args - Arguments object
 * @param {string} args.milestoneId - Milestone ID (required)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function deleteMilestone(args) {
  const { milestoneId } = args;

  if (!milestoneId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: milestoneId is required",
        },
      ],
    };
  }

  const mutation = `
    mutation {
      updateMilestone(input: {
        id: "${milestoneId}",
        patch: {
          stateId: "DELETED"
        }
      }) {
        milestone {
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

  const milestone = result.data?.data?.updateMilestone?.milestone;

  if (!milestone) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Milestone deletion failed. ${JSON.stringify(result.data, null, 2)}`,
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
            message: `Milestone deleted successfully`,
            milestone: {
              id: milestone.id,
              name: milestone.name,
              status: milestone.stateId,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}
