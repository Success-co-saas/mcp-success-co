// Users Tools
// Tools for working with users

import { callSuccessCoGraphQL, getLeadershipTeamId } from "./core.js";
import { validateStateId } from "../helpers.js";

/**
 * List Success.co users
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - User state filter (defaults to 'ACTIVE')
 * @param {string} [args.teamId] - Filter by team ID
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getUsers(args) {
  const {
    first,
    offset,
    stateId = "ACTIVE",
    teamId: providedTeamId,
    leadershipTeam = false,
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
  const filterStr = `stateId: {equalTo: "${stateId}"}`;
  
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
      users(${queryParams}) {
        nodes {
          id
          userName
          firstName
          lastName
          jobTitle
          desc
          avatar
          email
          userPermissionId
          userStatusId
          languageId
          timeZone
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
  let users = data.data.users.nodes;

  // If teamId filter is provided, get users associated with that team
  if (teamId) {
    const usersOnTeamsQuery = `
      query {
        usersOnTeams(filter: {teamId: {equalTo: "${teamId}"}, stateId: {equalTo: "${stateId}"}}) {
          nodes {
            userId
          }
        }
      }
    `;

    const usersOnTeamsResult = await callSuccessCoGraphQL(usersOnTeamsQuery);
    if (!usersOnTeamsResult.ok) {
      return {
        content: [{ type: "text", text: usersOnTeamsResult.error }],
      };
    }

    const userIdsInTeam = usersOnTeamsResult.data.data.usersOnTeams.nodes.map(
      (ut) => ut.userId
    );

    // Filter users to only include those in the team
    users = users.filter((user) => userIdsInTeam.includes(user.id));
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          totalCount: users.length,
          results: users.map((user) => ({
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            jobTitle: user.jobTitle || "",
            description: user.desc || "",
            userName: user.userName || "",
            avatar: user.avatar || "",
            status: user.userStatusId,
            language: user.languageId,
            timeZone: user.timeZone,
          })),
        }),
      },
    ],
  };
}
