// Milestones Tools
// Tools for working with rock milestones

import { callSuccessCoGraphQL, getLeadershipTeamId } from "./core.js";
import { validateStateId } from "../helpers.js";

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

  const filterParts = [`stateId: {equalTo: "${stateId}"}`];
  if (rockId) filterParts.push(`rockId: {equalTo: "${rockId}"}`);
  if (userId) filterParts.push(`userId: {equalTo: "${userId}"}`);
  if (teamId) filterParts.push(`teamId: {equalTo: "${teamId}"}`);
  if (keyword) filterParts.push(`name: {includesInsensitive: "${keyword}"}`);
  if (first !== undefined) filterParts.push(`first: ${first}`);
  if (offset !== undefined) filterParts.push(`offset: ${offset}`);

  const filterStr = filterParts.join(", ");

  const query = `
    query {
      milestones(${filterStr ? `filter: {${filterStr}}` : ""}) {
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
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          totalCount: data.data.milestones.totalCount,
          results: data.data.milestones.nodes.map((milestone) => ({
            id: milestone.id,
            rockId: milestone.rockId,
            name: milestone.name,
            dueDate: milestone.dueDate,
            userId: milestone.userId,
            milestoneStatusId: milestone.milestoneStatusId,
            createdAt: milestone.createdAt,
            status: milestone.stateId,
          })),
        }),
      },
    ],
  };
}
