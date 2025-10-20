// Search and Fetch Tools
// Tools for searching across Success.co entities and fetching specific items

import {
  callSuccessCoGraphQL,
  getSuccessCoApiKey,
  getGraphQLEndpoint,
} from "./core.js";

/**
 * Search across Success.co entities
 * @param {Object} args - Arguments object
 * @param {string} args.query - Search query string
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function search(args) {
  const { query } = args;
  const q = (query || "").toLowerCase();

  const wantsTeams =
    /\b(team|teams|my team|my teams)\b/.test(q) ||
    /list.*team/.test(q) ||
    /show.*team/.test(q);

  const wantsUsers =
    /\b(user|users|people|person|employee|employees)\b/.test(q) ||
    /list.*user/.test(q) ||
    /show.*user/.test(q) ||
    /list.*people/.test(q) ||
    /show.*people/.test(q);

  const wantsTodos =
    /\b(todo|todos|task|tasks|to-do|to-dos)\b/.test(q) ||
    /list.*todo/.test(q) ||
    /show.*todo/.test(q) ||
    /find.*todo/.test(q) ||
    /get.*todo/.test(q);

  const wantsRocks =
    /\b(rock|rocks|priority|priorities)\b/.test(q) ||
    /list.*rock/.test(q) ||
    /show.*rock/.test(q) ||
    /find.*rock/.test(q) ||
    /get.*rock/.test(q);

  const wantsMeetings =
    /\b(meeting|meetings|session|sessions)\b/.test(q) ||
    /list.*meeting/.test(q) ||
    /show.*meeting/.test(q) ||
    /find.*meeting/.test(q) ||
    /get.*meeting/.test(q);

  const wantsIssues =
    /\b(issue|issues|problem|problems|concern|concerns)\b/.test(q) ||
    /list.*issue/.test(q) ||
    /show.*issue/.test(q) ||
    /find.*issue/.test(q) ||
    /get.*issue/.test(q);

  const wantsHeadlines =
    /\b(headline|headlines|news|update|updates|announcement|announcements)\b/.test(
      q
    ) ||
    /list.*headline/.test(q) ||
    /show.*headline/.test(q) ||
    /find.*headline/.test(q) ||
    /get.*headline/.test(q);

  const wantsVisions =
    /\b(vision|visions|core values|core focus|three year goals|3 year goals|marketing strategy|market strategy)\b/.test(
      q
    ) ||
    /show.*vision/.test(q) ||
    /list.*vision/.test(q) ||
    /find.*vision/.test(q) ||
    /get.*vision/.test(q) ||
    /leadership.*team/.test(q) ||
    /current.*vision/.test(q);

  if (wantsTeams) {
    const gql = `
      query {
        teams(filter: {stateId: {equalTo: "ACTIVE"}}) {
          nodes {
            id
            name
            desc
          }
          totalCount
        }
      }
    `;
    const result = await callSuccessCoGraphQL(gql);
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

    const { data } = result;
    const hits = (data?.data?.teams?.nodes || []).map((t) => ({
      id: String(t.id), // REQUIRED by ChatGPT's fetch contract
      title: t.name ?? String(t.id),
      snippet: t.desc || "",
      // optional extras are fine, but keep required ones present
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            kind: "teams",
            totalCount: data?.data?.teams?.totalCount ?? hits.length,
            hits,
          }),
        },
      ],
    };
  }

  if (wantsUsers) {
    const gql = `
    query {
        users(filter: {stateId: {equalTo: "ACTIVE"}}) {
          nodes {
            id
            firstName
            lastName
            email
            jobTitle
            desc
          }
          totalCount
        }
      }
    `;
    const result = await callSuccessCoGraphQL(gql);
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

    const { data } = result;
    const hits = (data?.data?.users?.nodes || []).map((u) => ({
      id: String(u.id), // REQUIRED by ChatGPT's fetch contract
      title: `${u.firstName} ${u.lastName}`,
      snippet: `${u.jobTitle || ""} ${u.desc || ""}`.trim() || u.email,
      // optional extras are fine, but keep required ones present
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            kind: "users",
            totalCount: data?.data?.users?.totalCount ?? hits.length,
            hits,
          }),
        },
      ],
    };
  }

  if (wantsTodos) {
    const gql = `
      query {
        todos(filter: {stateId: {equalTo: "ACTIVE"}}) {
        nodes {
          id
          name
          desc
            type
            priorityNo
            dueDate
        }
        totalCount
      }
    `;
    const result = await callSuccessCoGraphQL(gql);
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

    const { data } = result;
    const hits = (data?.data?.todos?.nodes || []).map((t) => ({
      id: String(t.id), // REQUIRED by ChatGPT's fetch contract
      title: t.name ?? String(t.id),
      snippet:
        `${t.type || ""} ${t.desc || ""}`.trim() || `Priority: ${t.priorityNo}`,
      // optional extras are fine, but keep required ones present
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            kind: "todos",
            totalCount: data?.data?.todos?.totalCount ?? hits.length,
            hits,
          }),
        },
      ],
    };
  }

  if (wantsRocks) {
    const gql = `
      query {
        rocks(filter: {stateId: {equalTo: "ACTIVE"}}) {
          nodes {
            id
            name
            desc
            type
            dueDate
          }
          totalCount
        }
      }
    `;
    const result = await callSuccessCoGraphQL(gql);
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

    const { data } = result;
    const hits = (data?.data?.rocks?.nodes || []).map((r) => ({
      id: String(r.id), // REQUIRED by ChatGPT's fetch contract
      title: r.name ?? String(r.id),
      snippet: `${r.type || ""} ${r.desc || ""}`.trim() || `Due: ${r.dueDate}`,
      // optional extras are fine, but keep required ones present
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            kind: "rocks",
            totalCount: data?.data?.rocks?.totalCount ?? hits.length,
            hits,
          }),
        },
      ],
    };
  }

  if (wantsMeetings) {
    const gql = `
      query {
        meetings(filter: {stateId: {equalTo: "ACTIVE"}}) {
          nodes {
            id
            date
            startTime
            endTime
            averageRating
          }
          totalCount
        }
      }
    `;
    const result = await callSuccessCoGraphQL(gql);
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

    const { data } = result;
    const hits = (data?.data?.meetings?.nodes || []).map((m) => ({
      id: String(m.id), // REQUIRED by ChatGPT's fetch contract
      title: `Meeting on ${m.date}`,
      snippet: `${m.startTime || ""} - ${m.endTime || ""} (Rating: ${
        m.averageRating || "N/A"
      })`,
      // optional extras are fine, but keep required ones present
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            kind: "meetings",
            totalCount: data?.data?.meetings?.totalCount ?? hits.length,
            hits,
          }),
        },
      ],
    };
  }

  if (wantsIssues) {
    const gql = `
      query {
        issues(filter: {stateId: {equalTo: "ACTIVE"}}) {
          nodes {
            id
            name
            desc
            type
            priorityNo
          }
          totalCount
        }
      }
    `;
    const result = await callSuccessCoGraphQL(gql);
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

    const { data } = result;
    const hits = (data?.data?.issues?.nodes || []).map((i) => ({
      id: String(i.id), // REQUIRED by ChatGPT's fetch contract
      title: i.name ?? String(i.id),
      snippet:
        `${i.type || ""} ${i.desc || ""}`.trim() || `Priority: ${i.priorityNo}`,
      // optional extras are fine, but keep required ones present
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            kind: "issues",
            totalCount: data?.data?.issues?.totalCount ?? hits.length,
            hits,
          }),
        },
      ],
    };
  }

  if (wantsHeadlines) {
    const gql = `
      query {
        headlines(filter: {stateId: {equalTo: "ACTIVE"}}) {
          nodes {
            id
            name
            desc
            headlineStatusId
          }
          totalCount
        }
      }
    `;
    const result = await callSuccessCoGraphQL(gql);
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

    const { data } = result;
    const hits = (data?.data?.headlines?.nodes || []).map((h) => ({
      id: String(h.id), // REQUIRED by ChatGPT's fetch contract
      title: h.name ?? String(h.id),
      snippet: h.desc || `Status: ${h.headlineStatusId}`,
      // optional extras are fine, but keep required ones present
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            kind: "headlines",
            totalCount: data?.data?.headlines?.totalCount ?? hits.length,
            hits,
          }),
        },
      ],
    };
  }

  if (wantsVisions) {
    // First get leadership team visions
    const visionsGql = `
      query {
        visions(filter: {stateId: {equalTo: "ACTIVE"}, isLeadership: {equalTo: true}}) {
          nodes {
            id
            teamId
            isLeadership
            createdAt
          }
          totalCount
        }
      }
    `;
    const visionsResult = await callSuccessCoGraphQL(visionsGql);
    if (!visionsResult.ok)
      return { content: [{ type: "text", text: visionsResult.error }] };

    const { data: visionsData } = visionsResult;
    const leadershipVisions = visionsData?.data?.visions?.nodes || [];

    if (leadershipVisions.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              kind: "visions",
              totalCount: 0,
              hits: [],
              message: "No leadership team visions found",
            }),
          },
        ],
      };
    }

    // Get the first leadership vision (assuming there's typically one)
    const leadershipVision = leadershipVisions[0];

    // Get core values for this vision
    const coreValuesGql = `
      query {
        visionCoreValues(filter: {stateId: {equalTo: "ACTIVE"}, visionId: {equalTo: "${leadershipVision.id}"}}) {
          nodes {
            id
            name
            cascadeAll
            visionId
          }
          totalCount
        }
      }
    `;
    const coreValuesResult = await callSuccessCoGraphQL(coreValuesGql);

    // Get core focus types for this vision
    const coreFocusGql = `
      query {
        visionCoreFocusTypes(filter: {stateId: {equalTo: "ACTIVE"}, visionId: {equalTo: "${leadershipVision.id}"}}) {
          nodes {
            id
            name
            coreFocusName
            desc
            type
            visionId
          }
          totalCount
        }
      }
    `;
    const coreFocusResult = await callSuccessCoGraphQL(coreFocusGql);

    // Get three year goals for this vision
    const goalsGql = `
      query {
        visionThreeYearGoals(filter: {stateId: {equalTo: "ACTIVE"}, visionId: {equalTo: "${leadershipVision.id}"}}) {
          nodes {
            id
            name
            futureDate
            type
            visionId
          }
          totalCount
        }
      }
    `;
    const goalsResult = await callSuccessCoGraphQL(goalsGql);

    // Get market strategies for this vision
    const strategiesGql = `
      query {
        visionMarketStrategies(filter: {stateId: {equalTo: "ACTIVE"}, visionId: {equalTo: "${leadershipVision.id}"}}) {
          nodes {
            id
            name
            idealCustomer
            idealCustomerDesc
            provenProcess
            provenProcessDesc
            guarantee
            guaranteeDesc
            uniqueValueProposition
            visionId
          }
          totalCount
        }
      }
    `;
    const strategiesResult = await callSuccessCoGraphQL(strategiesGql);

    const hits = [];

    // Add core values
    if (
      coreValuesResult.ok &&
      coreValuesResult.data?.data?.visionCoreValues?.nodes
    ) {
      coreValuesResult.data.data.visionCoreValues.nodes.forEach((cv) => {
        hits.push({
          id: String(cv.id),
          title: `Core Value: ${cv.name}`,
          snippet: `Vision ID: ${cv.visionId}`,
          type: "core_value",
        });
      });
    }

    // Add core focus
    if (
      coreFocusResult.ok &&
      coreFocusResult.data?.data?.visionCoreFocusTypes?.nodes
    ) {
      coreFocusResult.data.data.visionCoreFocusTypes.nodes.forEach((cf) => {
        hits.push({
          id: String(cf.id),
          title: `Core Focus: ${cf.name}`,
          snippet: cf.desc || cf.coreFocusName || `Type: ${cf.type}`,
          type: "core_focus",
        });
      });
    }

    // Add three year goals
    if (goalsResult.ok && goalsResult.data?.data?.visionThreeYearGoals?.nodes) {
      goalsResult.data.data.visionThreeYearGoals.nodes.forEach((goal) => {
        hits.push({
          id: String(goal.id),
          title: `3-Year Goal: ${goal.name}`,
          snippet: `Target Date: ${goal.futureDate} | Type: ${goal.type}`,
          type: "three_year_goal",
        });
      });
    }

    // Add market strategies
    if (
      strategiesResult.ok &&
      strategiesResult.data?.data?.visionMarketStrategies?.nodes
    ) {
      strategiesResult.data.data.visionMarketStrategies.nodes.forEach(
        (strategy) => {
          hits.push({
            id: String(strategy.id),
            title: `Marketing Strategy: ${strategy.name}`,
            snippet: `Ideal Customer: ${strategy.idealCustomer} | Value Prop: ${strategy.uniqueValueProposition}`,
            type: "market_strategy",
          });
        }
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            kind: "visions",
            totalCount: hits.length,
            hits,
            visionId: leadershipVision.id,
            teamId: leadershipVision.teamId,
            isLeadership: leadershipVision.isLeadership,
          }),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: "I support searching for: teams, users, todos, rocks, meetings, issues, headlines, visions. Try: 'List my teams', 'Show users', 'Find todos', 'Get meetings', 'Show vision', etc.",
      },
    ],
  };
}

/**
 * Fetch a single Success.co item by id returned from search
 * @param {Object} args - Arguments object
 * @param {string} args.id - The id from a previous search hit
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function fetch(args) {
  const { id } = args;

  // Accept both raw ids like "123" and URIs like "success-co://teams/123", "success-co://users/123", etc.
  const teamMatch = /^success-co:\/\/teams\/(.+)$/.exec(id);
  const userMatch = /^success-co:\/\/users\/(.+)$/.exec(id);
  const todoMatch = /^success-co:\/\/todos\/(.+)$/.exec(id);
  const rockMatch = /^success-co:\/\/rocks\/(.+)$/.exec(id);
  const meetingMatch = /^success-co:\/\/meetings\/(.+)$/.exec(id);
  const issueMatch = /^success-co:\/\/issues\/(.+)$/.exec(id);
  const headlineMatch = /^success-co:\/\/headlines\/(.+)$/.exec(id);
  const visionMatch = /^success-co:\/\/visions\/(.+)$/.exec(id);
  const coreValueMatch = /^success-co:\/\/visionCoreValues\/(.+)$/.exec(id);
  const coreFocusMatch = /^success-co:\/\/visionCoreFocusTypes\/(.+)$/.exec(id);
  const goalMatch = /^success-co:\/\/visionThreeYearGoals\/(.+)$/.exec(id);
  const strategyMatch = /^success-co:\/\/visionMarketStrategies\/(.+)$/.exec(
    id
  );

  const teamId = teamMatch ? teamMatch[1] : null;
  const userId = userMatch ? userMatch[1] : null;
  const todoId = todoMatch ? todoMatch[1] : null;
  const rockId = rockMatch ? rockMatch[1] : null;
  const meetingId = meetingMatch ? meetingMatch[1] : null;
  const issueId = issueMatch ? issueMatch[1] : null;
  const headlineId = headlineMatch ? headlineMatch[1] : null;
  const visionId = visionMatch ? visionMatch[1] : null;
  const coreValueId = coreValueMatch ? coreValueMatch[1] : null;
  const coreFocusId = coreFocusMatch ? coreFocusMatch[1] : null;
  const goalId = goalMatch ? goalMatch[1] : null;
  const strategyId = strategyMatch ? strategyMatch[1] : null;
  const rawId =
    teamId ||
    userId ||
    todoId ||
    rockId ||
    meetingId ||
    issueId ||
    headlineId ||
    visionId ||
    coreValueId ||
    coreFocusId ||
    goalId ||
    strategyId ||
    id;

  const apiKey = getSuccessCoApiKey();
  if (!apiKey) {
    return {
      content: [
        {
          type: "text",
          text: "Success.co API key not set. Please set DEVMODE_SUCCESS_API_KEY in your .env file.",
        },
      ],
    };
  }

  // Helper function to make GraphQL requests
  const makeGraphQLRequest = async (query, variables = {}) => {
    const url = getGraphQLEndpoint();
    const response = await globalThis.fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (response.ok) {
      const data = await response.json();
      if (!data.errors) {
        return data;
      }
    }
    return null;
  };

  // Try to fetch as team
  if (
    teamId ||
    (!userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        team(id: $id) {
          id
          name
          desc
          badgeUrl
          color
          isLeadership
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.team) {
      return {
        content: [{ type: "text", text: JSON.stringify(result.data.team) }],
      };
    }
  }

  // Try to fetch as user
  if (
    userId ||
    (!teamId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        user(id: $id) {
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
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.user) {
      return {
        content: [{ type: "text", text: JSON.stringify(result.data.user) }],
      };
    }
  }

  // Try to fetch as todo
  if (
    todoId ||
    (!teamId &&
      !userId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        todo(id: $id) {
          id
          todoStatusId
          name
          desc
          teamId
          userId
          statusUpdatedAt
          type
          dueDate
          priorityNo
          createdAt
          stateId
          companyId
          meetingId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.todo) {
      return {
        content: [{ type: "text", text: JSON.stringify(result.data.todo) }],
      };
    }
  }

  // Try to fetch as rock
  if (
    rockId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        rock(id: $id) {
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
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.rock) {
      const rock = result.data.rock;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              id: rock.id,
              status: rock.rockStatusId,
              name: rock.name,
              desc: rock.desc,
              statusUpdatedAt: rock.statusUpdatedAt,
              type: rock.type,
              dueDate: rock.dueDate,
              createdAt: rock.createdAt,
              stateId: rock.stateId,
              companyId: rock.companyId,
            }),
          },
        ],
      };
    }
  }

  // Try to fetch as meeting
  if (
    meetingId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !issueId &&
      !headlineId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        meeting(id: $id) {
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
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.meeting) {
      return {
        content: [{ type: "text", text: JSON.stringify(result.data.meeting) }],
      };
    }
  }

  // Try to fetch as issue
  if (
    issueId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !headlineId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        issue(id: $id) {
          id
          issueStatusId
          name
          desc
          teamId
          userId
          type
          priorityNo
          priorityOrder
          statusUpdatedAt
          meetingId
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.issue) {
      return {
        content: [{ type: "text", text: JSON.stringify(result.data.issue) }],
      };
    }
  }

  // Try to fetch as headline
  if (
    headlineId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        headline(id: $id) {
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
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.headline) {
      return {
        content: [{ type: "text", text: JSON.stringify(result.data.headline) }],
      };
    }
  }

  // Try to fetch as vision
  if (
    visionId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !coreValueId &&
      !coreFocusId &&
      !goalId &&
      !strategyId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch &&
      !visionMatch &&
      !coreValueMatch &&
      !coreFocusMatch &&
      !goalMatch &&
      !strategyMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        vision(id: $id) {
          id
          teamId
          isLeadership
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.vision) {
      return {
        content: [{ type: "text", text: JSON.stringify(result.data.vision) }],
      };
    }
  }

  // Try to fetch as vision core value
  if (
    coreValueId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !visionId &&
      !coreFocusId &&
      !goalId &&
      !strategyId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch &&
      !visionMatch &&
      !coreValueMatch &&
      !coreFocusMatch &&
      !goalMatch &&
      !strategyMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        visionCoreValue(id: $id) {
          id
          name
          cascadeAll
          visionId
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.visionCoreValue) {
      return {
        content: [
          { type: "text", text: JSON.stringify(result.data.visionCoreValue) },
        ],
      };
    }
  }

  // Try to fetch as vision core focus type
  if (
    coreFocusId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !visionId &&
      !coreValueId &&
      !goalId &&
      !strategyId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch &&
      !visionMatch &&
      !coreValueMatch &&
      !coreFocusMatch &&
      !goalMatch &&
      !strategyMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        visionCoreFocusType(id: $id) {
          id
          name
          coreFocusName
          desc
          src
          type
          visionId
          cascadeAll
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.visionCoreFocusType) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.data.visionCoreFocusType),
          },
        ],
      };
    }
  }

  // Try to fetch as vision three year goal
  if (
    goalId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !visionId &&
      !coreValueId &&
      !coreFocusId &&
      !strategyId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch &&
      !visionMatch &&
      !coreValueMatch &&
      !coreFocusMatch &&
      !goalMatch &&
      !strategyMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        visionThreeYearGoal(id: $id) {
          id
          name
          futureDate
          cascadeAll
          visionId
          type
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.visionThreeYearGoal) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.data.visionThreeYearGoal),
          },
        ],
      };
    }
  }

  // Try to fetch as vision market strategy
  if (
    strategyId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !visionId &&
      !coreValueId &&
      !coreFocusId &&
      !goalId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch &&
      !visionMatch &&
      !coreValueMatch &&
      !coreFocusMatch &&
      !goalMatch &&
      !strategyMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        visionMarketStrategy(id: $id) {
          id
          name
          cascadeAll
          visionId
          idealCustomer
          idealCustomerDesc
          provenProcess
          provenProcessDesc
          guarantee
          guaranteeDesc
          uniqueValueProposition
          showProvenProcess
          showGuarantee
          isCustom
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.visionMarketStrategy) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.data.visionMarketStrategy),
          },
        ],
      };
    }
  }

  // If none worked, return error
  return {
    content: [
      {
        type: "text",
        text: `No team, user, todo, rock, meeting, issue, headline, vision, core value, core focus, goal, or strategy found for id ${rawId}`,
      },
    ],
  };
}
