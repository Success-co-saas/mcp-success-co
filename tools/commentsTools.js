// Comments Tools
// Tools for creating, reading, updating, and deleting comments

import { callSuccessCoGraphQL, getUserContext } from "./core.js";
import { validateStateId } from "../helpers.js";

/**
 * List Success.co comments for an entity
 * @param {Object} args - Arguments object
 * @param {number} [args.first=50] - Optional page size (defaults to 50)
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Comment state filter (defaults to 'ACTIVE')
 * @param {string} [args.entityType] - Filter by entity type: 'issue', 'rock', 'todo', 'milestone', 'meeting', etc.
 * @param {string} [args.entityId] - Filter by specific entity ID
 * @param {string} [args.userId] - Filter by comment author (user ID)
 * @param {string} [args.createdAfter] - Filter comments created after this date (ISO 8601 format)
 * @param {string} [args.createdBefore] - Filter comments created before this date (ISO 8601 format)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getComments(args) {
  const {
    first = 50,
    offset,
    stateId = "ACTIVE",
    entityType,
    entityId,
    userId,
    createdAfter,
    createdBefore,
  } = args;

  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  const filterItems = [`stateId: {equalTo: "${stateId}"}`];

  // Add entity type filter if provided
  if (entityType) {
    filterItems.push(`entityType: {equalTo: "${entityType}"}`);
  }

  // Add entity ID filter if provided
  if (entityId) {
    filterItems.push(`entityId: {equalTo: "${entityId}"}`);
  }

  // Add userId filter if provided
  if (userId) {
    filterItems.push(`userId: {equalTo: "${userId}"}`);
  }

  // Add date filters
  if (createdAfter) {
    filterItems.push(`createdAt: {greaterThanOrEqualTo: "${createdAfter}"}`);
  }
  if (createdBefore) {
    filterItems.push(`createdAt: {lessThanOrEqualTo: "${createdBefore}"}`);
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
      comments(${filterStr}) {
        nodes {
          id
          entityType
          entityId
          userId
          comment
          createdAt
          updatedAt
          stateId
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
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            totalCount: data.data.comments.totalCount,
            results: data.data.comments.nodes.map((comment) => ({
              id: comment.id,
              entityType: comment.entityType,
              entityId: comment.entityId,
              userId: comment.userId,
              comment: comment.comment,
              createdAt: comment.createdAt,
              updatedAt: comment.updatedAt,
              status: comment.stateId,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Create a new comment in Success.co
 * @param {Object} args - Arguments object
 * @param {string} args.comment - Comment text (required)
 * @param {string} args.entityType - Entity type: 'issue', 'rock', 'todo', 'milestone', 'meeting', etc. (required)
 * @param {string} args.entityId - Entity ID to comment on (required)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function createComment(args) {
  const { comment, entityType, entityId } = args;

  if (!comment) {
    return {
      content: [{ type: "text", text: "Error: comment is required" }],
    };
  }

  if (!entityType) {
    return {
      content: [{ type: "text", text: "Error: entityType is required" }],
    };
  }

  if (!entityId) {
    return {
      content: [{ type: "text", text: "Error: entityId is required" }],
    };
  }

  // Get user context for userId and companyId
  const userContext = await getUserContext();
  const userId = userContext.userId;
  const companyId = userContext.companyId;

  // Note: GraphQL schema uses 'objectId' for the input, but 'entityId' in the output
  // The comment text field is 'text' in the input schema
  // entityType is not needed in input - it's inferred from the objectId
  const mutation = `
    mutation {
      createComment(input: {
        comment: {
          text: "${comment.replace(/"/g, '\\"')}"
          objectId: "${entityId}"
          userId: "${userId}"
          companyId: "${companyId}"
          stateId: "ACTIVE"
        }
      }) {
        comment {
          id
          objectId
          userId
          text
          createdAt
          stateId
          companyId
        }
      }
    }
  `;

  const result = await callSuccessCoGraphQL(mutation);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const commentData = result.data?.data?.createComment?.comment;

  if (!commentData) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Comment creation failed. ${JSON.stringify(result.data, null, 2)}`,
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
            message: "Comment created successfully",
            comment: commentData,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Update a comment in Success.co
 * @param {Object} args - Arguments object
 * @param {string} args.commentId - Comment ID (required)
 * @param {string} args.comment - Updated comment text (required)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateComment(args) {
  const { commentId, comment } = args;

  if (!commentId) {
    return {
      content: [{ type: "text", text: "Error: commentId is required" }],
    };
  }

  if (!comment) {
    return {
      content: [{ type: "text", text: "Error: comment is required" }],
    };
  }

  const mutation = `
    mutation {
      updateComment(input: {
        id: "${commentId}",
        patch: {
          text: "${comment.replace(/"/g, '\\"')}"
        }
      }) {
        comment {
          id
          objectId
          userId
          text
          updatedAt
          stateId
        }
      }
    }
  `;

  const result = await callSuccessCoGraphQL(mutation);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const commentData = result.data?.data?.updateComment?.comment;

  if (!commentData) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Comment update failed. ${JSON.stringify(result.data, null, 2)}`,
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
            message: "Comment updated successfully",
            comment: commentData,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Delete a comment in Success.co
 * @param {Object} args - Arguments object
 * @param {string} args.commentId - Comment ID (required)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function deleteComment(args) {
  const { commentId } = args;

  if (!commentId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: commentId is required",
        },
      ],
    };
  }

  const mutation = `
    mutation {
      updateComment(input: {
        id: "${commentId}",
        patch: {
          stateId: "DELETED"
        }
      }) {
        comment {
          id
          text
          stateId
        }
      }
    }
  `;

  const result = await callSuccessCoGraphQL(mutation);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const commentData = result.data?.data?.updateComment?.comment;

  if (!commentData) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Comment deletion failed. ${JSON.stringify(result.data, null, 2)}`,
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
            message: `Comment deleted successfully`,
            comment: {
              id: commentData.id,
              text: commentData.text,
              status: commentData.stateId,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}

