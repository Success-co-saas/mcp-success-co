// Meetings Tools
// Tools for managing meetings, meeting infos, and meeting agendas

import {
  callSuccessCoGraphQL,
  getLeadershipTeamId,
  getUserContext,
} from "./core.js";
import { validateStateId } from "../helpers.js";
import { getCompanyCode, generateObjectUrl } from "./commonHelpers.js";

/**
 * List Success.co meetings
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Meeting state filter (defaults to 'ACTIVE')
 * @param {string} [args.teamId] - Filter by team ID (REQUIRED unless leadershipTeam is true)
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID
 * @param {string} [args.meetingAgendaId] - Filter by meeting agenda ID
 * @param {string} [args.meetingAgendaType] - Filter by meeting agenda type
 * @param {string} [args.dateAfter] - Filter meetings after this date (ISO format)
 * @param {string} [args.dateBefore] - Filter meetings before this date (ISO format)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getMeetings(args) {
  const {
    first,
    offset,
    stateId = "ACTIVE",
    teamId: providedTeamId,
    leadershipTeam = false,
    meetingAgendaId,
    meetingAgendaType,
    dateAfter,
    dateBefore,
  } = args;

  // Validate that only one of meetingAgendaId or meetingAgendaType is provided
  if (meetingAgendaId && meetingAgendaType) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Only one of meetingAgendaId or meetingAgendaType can be provided, not both.",
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

  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  // If teamId is provided, first get the meetingInfoIds for that team
  let meetingInfoIds = null;
  let meetingInfosMap = new Map();
  if (teamId) {
    const meetingInfosQuery = `
      query {
        meetingInfos(filter: {teamId: {equalTo: "${teamId}"}, stateId: {equalTo: "ACTIVE"}}) {
          nodes {
            id
            name
            teamId
            team {
              id
              name
            }
          }
        }
      }
    `;

    const meetingInfosResult = await callSuccessCoGraphQL(meetingInfosQuery);
    if (!meetingInfosResult.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching meeting infos: ${meetingInfosResult.error}`,
          },
        ],
      };
    }

    const meetingInfoNodes =
      meetingInfosResult.data?.data?.meetingInfos?.nodes || [];
    meetingInfoIds = meetingInfoNodes.map((mi) => mi.id);

    // Store meetingInfo data in a map for later lookup
    meetingInfoNodes.forEach((mi) => {
      meetingInfosMap.set(mi.id, mi);
    });

    if (meetingInfoIds.length === 0) {
      // No meeting infos found for this team, return empty result
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              totalCount: 0,
              results: [],
            }),
          },
        ],
      };
    }
  }

  const filterItems = [`stateId: {equalTo: "${stateId}"}`];

  // Filter by the meetingInfoIds we found for the team
  if (meetingInfoIds && meetingInfoIds.length > 0) {
    const meetingInfoIdsStr = meetingInfoIds.map((id) => `"${id}"`).join(", ");
    filterItems.push(`meetingInfoId: {in: [${meetingInfoIdsStr}]}`);
  }

  // Add meetingAgendaId filter if provided
  if (meetingAgendaId) {
    filterItems.push(`meetingAgendaId: {equalTo: "${meetingAgendaId}"}`);
  }

  // Add meetingAgendaType filter if provided
  if (meetingAgendaType) {
    filterItems.push(`meetingAgendaType: {equalTo: "${meetingAgendaType}"}`);
  }

  // Add date filters
  if (dateAfter) {
    filterItems.push(`date: {greaterThanOrEqualTo: "${dateAfter}"}`);
  }
  if (dateBefore) {
    filterItems.push(`date: {lessThanOrEqualTo: "${dateBefore}"}`);
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
      meetings(${filterStr}, orderBy: DATE_DESC) {
        nodes {
          id
          meetingInfoId
          date
          startTime
          endTime
          averageRating
          meetingStatusId
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

  // If we have meetings but no meetingInfo data yet (e.g., when querying by meetingAgendaId directly),
  // fetch the missing meetingInfo data
  const meetings = data.data.meetings.nodes;
  const missingMeetingInfoIds = meetings
    .map((m) => m.meetingInfoId)
    .filter((id) => id && !meetingInfosMap.has(id));

  if (missingMeetingInfoIds.length > 0) {
    const uniqueIds = [...new Set(missingMeetingInfoIds)];
    const meetingInfoIdsStr = uniqueIds.map((id) => `"${id}"`).join(", ");
    const additionalMeetingInfosQuery = `
      query {
        meetingInfos(filter: {id: {in: [${meetingInfoIdsStr}]}}) {
          nodes {
            id
            name
            teamId
            team {
              id
              name
            }
          }
        }
      }
    `;

    const additionalResult = await callSuccessCoGraphQL(
      additionalMeetingInfosQuery
    );
    if (additionalResult.ok) {
      const additionalNodes =
        additionalResult.data?.data?.meetingInfos?.nodes || [];
      additionalNodes.forEach((mi) => {
        meetingInfosMap.set(mi.id, mi);
      });
    }
  }

  // Get company code for URL generation
  const context = await getUserContext();
  const companyCode = context ? await getCompanyCode(context.companyId) : null;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          totalCount: data.data.meetings.totalCount,
          results: meetings.map((meeting) => {
            const meetingInfo = meetingInfosMap.get(meeting.meetingInfoId);
            return {
              id: meeting.id,
              meetingInfoId: meeting.meetingInfoId,
              meetingInfoName: meetingInfo?.name,
              teamId: meetingInfo?.teamId,
              teamName: meetingInfo?.team?.name,
              date: meeting.date,
              startTime: meeting.startTime,
              endTime: meeting.endTime,
              averageRating: meeting.averageRating,
              status: meeting.meetingStatusId,
              createdAt: meeting.createdAt,
              url: companyCode ? generateObjectUrl('meetings', meeting.id, companyCode) : null,
            };
          }),
        }),
      },
    ],
  };
}

/**
 * Get meeting infos (recurring meeting configurations)
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Number of records to return (default: 50)
 * @param {number} [args.offset] - Number of records to skip (default: 0)
 * @param {string} [args.stateId] - State filter (defaults to 'ACTIVE')
 * @param {string} [args.teamId] - Filter by team ID
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID
 * @param {string} [args.meetingInfoStatusId] - Filter by meeting info status
 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
 */
export async function getMeetingInfos(args) {
  const {
    first = 50,
    offset = 0,
    stateId = "ACTIVE",
    teamId: providedTeamId,
    leadershipTeam = false,
    meetingInfoStatusId,
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

  // Build filter
  const filterItems = [`stateId: {equalTo: "${stateId}"}`];
  if (teamId) {
    filterItems.push(`teamId: {equalTo: "${teamId}"}`);
  }
  if (meetingInfoStatusId) {
    filterItems.push(
      `meetingInfoStatusId: {equalTo: "${meetingInfoStatusId}"}`
    );
  }

  const filterStr = filterItems.join(", ");

  const query = `
    query {
      meetingInfos(filter: {${filterStr}}, first: ${first}, offset: ${offset}, orderBy: CREATED_AT_DESC) {
        nodes {
          id
          name
          desc
          meetingAgendaId
          teamId
          meetingInfoStatusId
          meetingRepeatsId
          createdAt
          isBulkUpdate
          stateId
          companyId
          ownerUserId
          repeatInterval
          repeatUnit
          selectedDays
          team {
            id
            name
            desc
            color
            isLeadership
          }
          meetingAgenda {
            id
            name
            desc
            meetingAgendaStatusId
            meetingRepeatsId
            builtIn
            meetingAgendaTypeId
            facilitatorUserId
            scribeUserId
          }
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
            totalCount: data.data.meetingInfos.totalCount,
            results: data.data.meetingInfos.nodes,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Get meeting agendas (templates for meetings)
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Number of records to return (default: 50)
 * @param {number} [args.offset] - Number of records to skip (default: 0)
 * @param {string} [args.stateId] - State filter (defaults to 'ACTIVE')
 * @param {string} [args.teamId] - Filter by team ID
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID
 * @param {string} [args.meetingAgendaStatusId] - Filter by agenda status
 * @param {string} [args.meetingAgendaTypeId] - Filter by agenda type (e.g., 'LEVEL10', 'CUSTOM')
 * @param {boolean} [args.builtIn] - Filter by built-in agendas (true/false)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getMeetingAgendas(args) {
  const {
    first = 50,
    offset = 0,
    stateId = "ACTIVE",
    teamId: providedTeamId,
    leadershipTeam = false,
    meetingAgendaStatusId,
    meetingAgendaTypeId,
    builtIn,
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

  // Build filter conditions
  const filterConditions = [
    `stateId: {equalTo: "${stateId}"}`,
    teamId ? `teamId: {equalTo: "${teamId}"}` : "",
    meetingAgendaStatusId
      ? `meetingAgendaStatusId: {equalTo: "${meetingAgendaStatusId}"}`
      : "",
    meetingAgendaTypeId
      ? `meetingAgendaTypeId: {equalTo: "${meetingAgendaTypeId}"}`
      : "",
    builtIn !== undefined ? `builtIn: {equalTo: ${builtIn}}` : "",
  ].filter(Boolean);

  const filterStr = filterConditions.join(", ");

  const query = `
    query {
      meetingAgendas(first: ${first}, offset: ${offset}, filter: {${filterStr}}, orderBy: CREATED_AT_DESC) {
        nodes {
          id
          name
          desc
          builtIn
          meetingAgendaStatusId
          meetingRepeatsId
          meetingAgendaTypeId
          teamId
          createdAt
          stateId
          companyId
          facilitatorUserId
          scribeUserId
          repeatInterval
          repeatUnit
          selectedDays
          team {
            id
            name
            desc
            color
            isLeadership
          }
          meetingAgendaStatus {
            id
            name
            color
            order
          }
          meetingAgendaType {
            id
            name
            order
          }
          facilitatorUser {
            id
            firstName
            lastName
            email
            jobTitle
          }
          scribeUser {
            id
            firstName
            lastName
            email
            jobTitle
          }
          meetingAgendaSections(orderBy: ORDER_ASC) {
            nodes {
              id
              name
              desc
              order
              duration
              type
              visible
            }
          }
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching meeting agendas: ${result.error}`,
        },
      ],
    };
  }

  const data = result.data?.data?.meetingAgendas;

  if (!data) {
    return {
      content: [
        {
          type: "text",
          text: "Error: No meeting agendas data returned",
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
            totalCount: data.totalCount,
            results: data.nodes,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Get detailed information about a specific meeting
 * @param {Object} args - Arguments object
 * @param {string} [args.meetingId] - Meeting ID (required unless lastFinishedL10 is true)
 * @param {boolean} [args.lastFinishedL10] - If true, automatically fetch the most recent FINISHED L10 meeting for the team
 * @param {string} [args.teamId] - Team ID (required when using lastFinishedL10)
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID (shortcut for teamId with lastFinishedL10)
 * @param {string} [args.stateId] - State filter (defaults to 'ACTIVE')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getMeetingDetails(args) {
  const { 
    meetingId: providedMeetingId, 
    stateId = "ACTIVE",
    lastFinishedL10 = false,
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

  // Validate parameters
  if (!providedMeetingId && !lastFinishedL10) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Either meetingId or lastFinishedL10=true (with teamId or leadershipTeam) is required",
        },
      ],
    };
  }

  if (lastFinishedL10 && !teamId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: When using lastFinishedL10=true, you must provide teamId or leadershipTeam=true",
        },
      ],
    };
  }

  let meetingId = providedMeetingId;

  try {
    // If lastFinishedL10 is true, find the most recent FINISHED L10 meeting for the team
    if (lastFinishedL10 && teamId) {
      // First get the L10 meeting agenda for this team
      const meetingInfosQuery = `
        query {
          meetingInfos(filter: {teamId: {equalTo: "${teamId}"}, stateId: {equalTo: "ACTIVE"}}) {
            nodes {
              id
              meetingAgendaId
              meetingAgenda {
                meetingAgendaTypeId
              }
            }
          }
        }
      `;

      const meetingInfosResult = await callSuccessCoGraphQL(meetingInfosQuery);
      if (!meetingInfosResult.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching meeting infos: ${meetingInfosResult.error}`,
            },
          ],
        };
      }

      const meetingInfos = meetingInfosResult.data.data.meetingInfos.nodes;
      
      // Find L10 meeting info (WEEKLY-L10 type)
      const l10MeetingInfo = meetingInfos.find(
        (mi) => mi.meetingAgenda?.meetingAgendaTypeId === "WEEKLY-L10"
      );

      if (!l10MeetingInfo) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "No L10 meeting found for this team",
                teamId: teamId,
                suggestion: "This team may not have a Level 10 meeting set up.",
              }),
            },
          ],
        };
      }

      // Get the most recent FINISHED meeting for this meeting info
      const recentMeetingQuery = `
        query {
          meetings(
            first: 1, 
            orderBy: DATE_DESC,
            filter: {
              meetingInfoId: {equalTo: "${l10MeetingInfo.id}"}, 
              stateId: {equalTo: "${stateId}"},
              meetingStatusId: {equalTo: "FINISHED"}
            }
          ) {
            nodes {
              id
            }
          }
        }
      `;

      const recentMeetingResult = await callSuccessCoGraphQL(recentMeetingQuery);
      if (!recentMeetingResult.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching recent meeting: ${recentMeetingResult.error}`,
            },
          ],
        };
      }

      const recentMeetings = recentMeetingResult.data.data.meetings.nodes;
      if (recentMeetings.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "No finished L10 meetings found for this team",
                teamId: teamId,
                suggestion: "This team may not have had any completed Level 10 meetings yet, or they are still in progress.",
              }),
            },
          ],
        };
      }

      meetingId = recentMeetings[0].id;
    }

    // Step 1: Get the specific meeting
    const meetingsQuery = `
      query {
        meetings(first: 1, filter: {stateId: {equalTo: "${stateId}"}, id: {equalTo: "${meetingId}"}}) {
          nodes {
            id
            meetingInfoId
            date
            startTime
            endTime
            averageRating
            meetingStatusId
            createdAt
          }
          totalCount
        }
      }
    `;

    const meetingsResult = await callSuccessCoGraphQL(meetingsQuery);
    if (!meetingsResult.ok) {
      return {
        content: [{ type: "text", text: meetingsResult.error }],
      };
    }

    const meetings = meetingsResult.data.data.meetings.nodes;

    if (meetings.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Meeting not found",
              meetingId,
            }),
          },
        ],
      };
    }

    // Step 2: Get all meeting IDs for batch queries
    const meetingIds = meetings.map((m) => m.id);
    const meetingIdsStr = meetingIds.map((id) => `"${id}"`).join(", ");

    // Step 3: Fetch related data in parallel
    const [headlinesResult, todosResult, issuesResult] = await Promise.all([
      // Get headlines for these meetings
      callSuccessCoGraphQL(`
        query {
          headlines(filter: {meetingId: {in: [${meetingIdsStr}]}, stateId: {equalTo: "${stateId}"}}) {
            nodes {
              id
              name
              desc
              userId
              teamId
              headlineStatusId
              meetingId
              createdAt
            }
          }
        }
      `),

      // Get todos for these meetings
      callSuccessCoGraphQL(`
        query {
          todos(filter: {meetingId: {in: [${meetingIdsStr}]}, stateId: {equalTo: "${stateId}"}}) {
            nodes {
              id
              name
              desc
              todoStatusId
              userId
              teamId
              meetingId
              dueDate
              createdAt
            }
          }
        }
      `),

      // Get issues for these meetings
      callSuccessCoGraphQL(`
        query {
          issues(filter: {meetingId: {in: [${meetingIdsStr}]}, stateId: {equalTo: "${stateId}"}}) {
            nodes {
              id
              name
              desc
              issueStatusId
              userId
              teamId
              meetingId
              createdAt
            }
          }
        }
      `),
    ]);

    // Organize data by meeting (we only have one meeting since meetingId is required)
    const meeting = meetings[0];

    const headlines = headlinesResult.ok
      ? headlinesResult.data.data.headlines.nodes.filter(
          (h) => h.meetingId === meeting.id
        )
      : [];

    const todos = todosResult.ok
      ? todosResult.data.data.todos.nodes.filter(
          (t) => t.meetingId === meeting.id
        )
      : [];

    const issues = issuesResult.ok
      ? issuesResult.data.data.issues.nodes.filter(
          (i) => i.meetingId === meeting.id
        )
      : [];

    // Get company code for URL generation
    const context = await getUserContext();
    const companyCode = context ? await getCompanyCode(context.companyId) : null;

    const meetingDetails = {
      meeting: {
        id: meeting.id,
        meetingInfoId: meeting.meetingInfoId,
        date: meeting.date,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        averageRating: meeting.averageRating,
        status: meeting.meetingStatusId,
        createdAt: meeting.createdAt,
        url: companyCode ? generateObjectUrl('meetings', meeting.id, companyCode) : null,
      },
      headlines: headlines.map((h) => ({
        id: h.id,
        name: h.name,
        description: h.desc || "",
        status: h.headlineStatusId,
        userId: h.userId,
        teamId: h.teamId,
        createdAt: h.createdAt,
      })),
      todos: todos.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.desc || "",
        status: t.todoStatusId,
        userId: t.userId,
        teamId: t.teamId,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
      })),
      issues: issues.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.desc || "",
        status: i.issueStatusId,
        userId: i.userId,
        teamId: i.teamId,
        createdAt: i.createdAt,
      })),
      summary: {
        headlineCount: headlines.length,
        todoCount: todos.length,
        issueCount: issues.length,
      },
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(meetingDetails, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching meeting details: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Create a new meeting
 * @param {Object} args - Arguments object
 * @param {string} args.date - Meeting date (YYYY-MM-DD format, required)
 * @param {string} [args.meetingAgendaId] - Meeting agenda ID (provide either this or meetingAgendaType)
 * @param {string} [args.meetingAgendaType] - Meeting agenda type: ANNUAL-PLANNING-DAY-1, ANNUAL-PLANNING-DAY-2, QUARTERLY-PULSING-AGENDA, WEEKLY-L10, FOCUS-DAY, or VISION-BUILDING-SESSION
 * @param {string} [args.teamId] - Team ID (provide either this or leadershipTeam)
 * @param {boolean} [args.leadershipTeam] - If true, use the leadership team
 * @param {string} [args.name] - Optional name for the meeting info (defaults to agenda name)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 * @note Meeting status defaults to 'NOT-STARTED'. Start and end times are set when the meeting is started/ended.
 */
export async function createMeeting(args) {
  const {
    date,
    meetingAgendaId: providedAgendaId,
    meetingAgendaType,
    teamId: providedTeamId,
    leadershipTeam = false,
    name,
  } = args;

  // Validate required parameters
  if (!date) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Meeting date is required (format: YYYY-MM-DD)",
        },
      ],
    };
  }

  // Validate date is not in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of day for comparison
  const meetingDate = new Date(date);
  if (meetingDate < today) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Cannot create a meeting with a date in the past. Please use a current or future date.",
        },
      ],
    };
  }

  if (!providedAgendaId && !meetingAgendaType) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Either meetingAgendaId or meetingAgendaType is required",
        },
      ],
    };
  }

  if (!providedTeamId && !leadershipTeam) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Either teamId or leadershipTeam=true is required",
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
  const userId = context.userId;

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

  // Resolve meetingAgendaId if meetingAgendaType is provided
  let meetingAgendaId = providedAgendaId;
  let agendaName = name;

  if (meetingAgendaType && !providedAgendaId) {
    // Look up the meeting agenda by type and team
    const agendaQuery = `
      query {
        meetingAgendas(
          filter: {
            meetingAgendaTypeId: {equalTo: "${meetingAgendaType}"}
            teamId: {equalTo: "${teamId}"}
            stateId: {equalTo: "ACTIVE"}
          }
          first: 1
        ) {
          nodes {
            id
            name
          }
        }
      }
    `;

    const agendaResult = await callSuccessCoGraphQL(agendaQuery);

    if (!agendaResult.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error looking up meeting agenda: ${agendaResult.error}`,
          },
        ],
      };
    }

    const agendas = agendaResult.data?.data?.meetingAgendas?.nodes || [];

    if (agendas.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `Error: No meeting agenda found with type "${meetingAgendaType}" for the specified team. Use getMeetingAgendas to see available agendas.`,
          },
        ],
      };
    }

    meetingAgendaId = agendas[0].id;
    if (!agendaName) {
      agendaName = agendas[0].name;
    }
  }

  // Step 1: Create meeting info
  const createMeetingInfoMutation = `
    mutation CreateMeetingInfo($input: CreateMeetingInfoInput!) {
      createMeetingInfo(input: $input) {
        meetingInfo {
          id
          name
          meetingAgendaId
          teamId
          ownerUserId
          stateId
        }
      }
    }
  `;

  const meetingInfoVariables = {
    input: {
      meetingInfo: {
        name: agendaName || `Meeting on ${date}`,
        meetingAgendaId,
        teamId,
        ownerUserId: userId,
        companyId,
        stateId: "ACTIVE",
        meetingInfoStatusId: "ACTIVE",
        meetingRepeatsId: "NEVER",
      },
    },
  };

  const meetingInfoResult = await callSuccessCoGraphQL(
    createMeetingInfoMutation,
    meetingInfoVariables
  );

  if (!meetingInfoResult.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error creating meeting info: ${meetingInfoResult.error}`,
        },
      ],
    };
  }

  const meetingInfo =
    meetingInfoResult.data?.data?.createMeetingInfo?.meetingInfo;

  if (!meetingInfo) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Meeting info creation failed. ${JSON.stringify(
            meetingInfoResult.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  // Step 2: Create meeting using the meeting info ID
  const createMeetingMutation = `
    mutation CreateMeeting($input: CreateMeetingInput!) {
      createMeeting(input: $input) {
        meeting {
          id
          date
          startTime
          endTime
          meetingStatusId
          meetingInfoId
          createdAt
          stateId
          companyId
        }
      }
    }
  `;

  const meetingVariables = {
    input: {
      meeting: {
        date,
        meetingInfoId: meetingInfo.id,
        meetingStatusId: "NOT-STARTED",
        companyId,
        stateId: "ACTIVE",
      },
    },
  };

  const meetingResult = await callSuccessCoGraphQL(
    createMeetingMutation,
    meetingVariables
  );

  if (!meetingResult.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error creating meeting: ${meetingResult.error}`,
        },
      ],
    };
  }

  const createdMeeting = meetingResult.data?.data?.createMeeting?.meeting;

  if (!createdMeeting) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Meeting creation failed. ${JSON.stringify(
            meetingResult.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  // Re-fetch the meeting to return it in the same format as getMeetings
  const fetchQuery = `
    query {
      meetings(filter: {id: {equalTo: "${createdMeeting.id}"}}) {
        nodes {
          id
          meetingInfoId
          date
          startTime
          endTime
          averageRating
          meetingStatusId
          createdAt
          stateId
          companyId
        }
      }
    }
  `;

  const fetchResult = await callSuccessCoGraphQL(fetchQuery);
  const companyCode = await getCompanyCode(companyId);

  if (!fetchResult.ok || !fetchResult.data?.data?.meetings?.nodes?.[0]) {
    // Fallback to created data if re-fetch fails
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              message: "Meeting created successfully",
              meetingInfo: {
                id: meetingInfo.id,
                name: meetingInfo.name,
                meetingAgendaId: meetingInfo.meetingAgendaId,
                teamId: meetingInfo.teamId,
              },
              meeting: {
                id: createdMeeting.id,
                meetingInfoId: createdMeeting.meetingInfoId,
                date: createdMeeting.date,
                startTime: createdMeeting.startTime,
                endTime: createdMeeting.endTime,
                averageRating: createdMeeting.averageRating,
                status: createdMeeting.meetingStatusId,
                createdAt: createdMeeting.createdAt,
                url: companyCode ? generateObjectUrl('meetings', createdMeeting.id, companyCode) : null,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  const meeting = fetchResult.data.data.meetings.nodes[0];

  // Return in same format as getMeetings
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: "Meeting created successfully",
            meetingInfo: {
              id: meetingInfo.id,
              name: meetingInfo.name,
              meetingAgendaId: meetingInfo.meetingAgendaId,
              teamId: meetingInfo.teamId,
            },
            meeting: {
              id: meeting.id,
              meetingInfoId: meeting.meetingInfoId,
              date: meeting.date,
              startTime: meeting.startTime,
              endTime: meeting.endTime,
              averageRating: meeting.averageRating,
              status: meeting.meetingStatusId,
              createdAt: meeting.createdAt,
              url: companyCode ? generateObjectUrl('meetings', meeting.id, companyCode) : null,
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
 * Update an existing meeting
 * @param {Object} args - Arguments object
 * @param {string} args.meetingId - Meeting ID (required)
 * @param {string} [args.date] - Update meeting date
 * @param {string} [args.state] - Update state (e.g., 'ACTIVE', 'DELETED')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateMeeting(args) {
  const { meetingId, date, state, name, meetingStatusId } = args;

  if (!meetingId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Meeting ID is required",
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

  // Validate date is not in the past if date is being updated
  if (date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for comparison
    const meetingDate = new Date(date);
    if (meetingDate < today) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Cannot update a meeting to a date in the past. Please use a current or future date.",
          },
        ],
      };
    }
  }

  const mutation = `
    mutation UpdateMeeting($input: UpdateMeetingInput!) {
      updateMeeting(input: $input) {
        meeting {
          id
          date
          meetingInfoId
          meetingStatusId
          stateId
        }
      }
    }
  `;

  const updates = {};
  if (date) updates.date = date;
  if (state) updates.stateId = state;
  if (meetingStatusId) updates.meetingStatusId = meetingStatusId;

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
      id: meetingId,
      patch: updates,
    },
  };

  const result = await callSuccessCoGraphQL(mutation, variables);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error updating meeting: ${result.error}`,
        },
      ],
    };
  }

  const updatedMeeting = result.data?.data?.updateMeeting?.meeting;

  if (!updatedMeeting) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Meeting update failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  // Re-fetch the meeting to return it in the same format as getMeetings
  const fetchQuery = `
    query {
      meetings(filter: {id: {equalTo: "${meetingId}"}}) {
        nodes {
          id
          meetingInfoId
          date
          startTime
          endTime
          averageRating
          meetingStatusId
          createdAt
          stateId
          companyId
        }
      }
    }
  `;

  const fetchResult = await callSuccessCoGraphQL(fetchQuery);
  const companyCode = context ? await getCompanyCode(context.companyId) : null;

  if (!fetchResult.ok || !fetchResult.data?.data?.meetings?.nodes?.[0]) {
    // Fallback to updated data if re-fetch fails
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              message: "Meeting updated successfully",
              meeting: {
                id: updatedMeeting.id,
                meetingInfoId: updatedMeeting.meetingInfoId,
                date: updatedMeeting.date,
                startTime: updatedMeeting.startTime,
                endTime: updatedMeeting.endTime,
                averageRating: updatedMeeting.averageRating,
                status: updatedMeeting.meetingStatusId,
                createdAt: updatedMeeting.createdAt,
                url: companyCode ? generateObjectUrl('meetings', updatedMeeting.id, companyCode) : null,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  const meeting = fetchResult.data.data.meetings.nodes[0];

  // Return in same format as getMeetings
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: "Meeting updated successfully",
            meeting: {
              id: meeting.id,
              meetingInfoId: meeting.meetingInfoId,
              date: meeting.date,
              startTime: meeting.startTime,
              endTime: meeting.endTime,
              averageRating: meeting.averageRating,
              status: meeting.meetingStatusId,
              createdAt: meeting.createdAt,
              url: companyCode ? generateObjectUrl('meetings', meeting.id, companyCode) : null,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}
