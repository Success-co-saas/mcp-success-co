// People Analyzer Tools
// Tools for working with People Analyzer sessions

import { callSuccessCoGraphQL, getLeadershipTeamId } from "./core.js";
import { validateStateId } from "../helpers.js";

/**
 * Get People Analyzer sessions and results
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - State filter (defaults to 'ACTIVE')
 * @param {string} [args.teamId] - Filter by team ID
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID
 * @param {string} [args.sessionId] - Filter by specific session ID
 * @param {string} [args.createdAfter] - Filter sessions created after this date
 * @param {string} [args.createdBefore] - Filter sessions created before this date
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getPeopleAnalyzerSessions(args) {
  const {
    first = 50,
    offset = 0,
    stateId = "ACTIVE",
    teamId: providedTeamId,
    leadershipTeam = false,
    sessionId,
    createdAfter,
    createdBefore,
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

  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  const filterItems = [`stateId: {equalTo: "${stateId}"}`];

  if (teamId) {
    filterItems.push(`teamId: {equalTo: "${teamId}"}`);
  }
  if (sessionId) {
    filterItems.push(`id: {equalTo: "${sessionId}"}`);
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
      peopleAnalyzerSessions(${filterStr}) {
        nodes {
          id
          name
          teamId
          peopleAnalyzerSessionStatusId
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

  const sessions = result.data.data.peopleAnalyzerSessions.nodes;

  // For each session, get the user scores
  const sessionsWithScores = await Promise.all(
    sessions.map(async (session) => {
      const scoresQuery = `
        query {
          peopleAnalyzerSessionUsersScores(filter: {peopleAnalyzerSessionId: {equalTo: "${session.id}"}}) {
            nodes {
              id
              peopleAnalyzerSessionUserId
              peopleAnalyzerSessionId
              rightPerson
              rightSeat
              getsIt
              wantsIt
              capacityToDoIt
              createdAt
              updatedAt
            }
          }
          peopleAnalyzerSessionUsers(filter: {peopleAnalyzerSessionId: {equalTo: "${session.id}"}}) {
            nodes {
              id
              peopleAnalyzerSessionId
              userId
              createdAt
            }
          }
        }
      `;

      const scoresResult = await callSuccessCoGraphQL(scoresQuery);
      if (!scoresResult.ok) {
        return { ...session, users: [], scores: [] };
      }

      return {
        ...session,
        users: scoresResult.data.data.peopleAnalyzerSessionUsers.nodes,
        scores: scoresResult.data.data.peopleAnalyzerSessionUsersScores.nodes,
      };
    })
  );

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            totalCount: result.data.data.peopleAnalyzerSessions.totalCount,
            sessions: sessionsWithScores,
          },
          null,
          2
        ),
      },
    ],
  };
}
