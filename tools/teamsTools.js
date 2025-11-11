// Teams Tools
// Tools for working with teams

import { callSuccessCoGraphQL } from "./core.js";
import { validateStateId } from "../utils/helpers.js";

/**
 * List Success.co teams
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Team state filter (defaults to 'ACTIVE')
 * @param {string} [args.keyword] - Search for teams with names containing this keyword (case-insensitive)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 * @description Returns teams with isLeadership flag to identify the leadership team
 */
export async function getTeams(args) {
  const { first, offset, stateId = "ACTIVE", keyword } = args;
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }
  const filterItems = [`stateId: {equalTo: "${stateId}"}`];

  if (keyword) {
    filterItems.push(`name: {includesInsensitive: "${keyword}"}`);
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
      teams(${filterStr}) {
        nodes {
          id
          badgeUrl
          name
          desc
          color
          isLeadership
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
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          totalCount: data.data.teams.totalCount,
          results: data.data.teams.nodes.map((team) => ({
            id: team.id,
            title: team.name,
            description: team.desc || "",
            color: team.color,
            status: team.stateId,
            isLeadership: team.isLeadership,
          })),
        }),
      },
    ],
  };
}
