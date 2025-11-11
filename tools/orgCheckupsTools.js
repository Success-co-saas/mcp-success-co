// Organization Checkups Tools
// Tools for working with organization checkup sessions

import { callSuccessCoGraphQL } from "./core.js";
import { validateStateId } from "../utils/helpers.js";

/**
 * Get Organization Checkup sessions and scores
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - State filter (defaults to 'ACTIVE')
 * @param {string} [args.checkupId] - Filter by specific checkup ID
 * @param {string} [args.createdAfter] - Filter checkups created after this date
 * @param {string} [args.createdBefore] - Filter checkups created before this date
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getOrgCheckups(args = {}) {
  const {
    first = 50,
    offset = 0,
    stateId = "ACTIVE",
    checkupId,
    createdAfter,
    createdBefore,
  } = args;

  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  const filterItems = [`stateId: {equalTo: "${stateId}"}`];

  if (checkupId) {
    filterItems.push(`id: {equalTo: "${checkupId}"}`);
  }
  if (createdAfter) {
    filterItems.push(`createdAt: {greaterThanOrEqualTo: "${createdAfter}"}`);
  }
  if (createdBefore) {
    filterItems.push(`createdAt: {lessThanOrEqualTo: "${createdBefore}"}`);
  }

  const filterStr = [
    filterItems.length > 0 ? `filter: {${filterItems.join(", ")}}` : "",
    `first: ${first}`,
    `offset: ${offset}`,
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      orgCheckups(${filterStr}) {
        nodes {
          id
          orgCheckupStatusId
          createdAt
          updatedAt
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

  const checkups = result.data.data.orgCheckups.nodes;

  // For each checkup, get the answers/scores
  const checkupsWithAnswers = await Promise.all(
    checkups.map(async (checkup) => {
      const answersQuery = `
        query {
          orgCheckupAnswers(filter: {orgCheckupId: {equalTo: "${checkup.id}"}}) {
            nodes {
              id
              orgCheckupId
              questionNumber
              score
              createdByUserId
              isFinal
              createdAt
              updatedAt
            }
          }
        }
      `;

      const answersResult = await callSuccessCoGraphQL(answersQuery);
      if (!answersResult.ok) {
        return { ...checkup, answers: [] };
      }

      return {
        ...checkup,
        answers: answersResult.data.data.orgCheckupAnswers.nodes,
      };
    })
  );

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            totalCount: result.data.data.orgCheckups.totalCount,
            checkups: checkupsWithAnswers,
          },
          null,
          2
        ),
      },
    ],
  };
}
