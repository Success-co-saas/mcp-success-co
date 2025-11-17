// Vision/Traction Organizer (VTO) Tools
// Tools for working with company vision, core values, core focus, goals, and strategies

import { callSuccessCoGraphQL, getUserContext } from "./core.js";
import { validateStateId } from "../utils/helpers.js";

/**
 * Get the complete leadership Vision/Traction Organizer in one call
 * @param {Object} args - Arguments object
 * @param {string} args.stateId - State filter (defaults to 'ACTIVE')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getLeadershipVTO(args) {
  const { stateId = "ACTIVE" } = args;

  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  try {
    // Step 1: Find the leadership vision
    // First, try to find vision with isLeadership: true
    const visionsQuery = `
      query {
        visions(filter: {stateId: {equalTo: "${stateId}"}, isLeadership: {equalTo: true}}) {
          nodes {
            id
            teamId
            isLeadership
            createdAt
            stateId
            companyId
          }
          totalCount
        }
      }
    `;

    const visionsResult = await callSuccessCoGraphQL(visionsQuery);
    if (!visionsResult.ok) {
      return { content: [{ type: "text", text: visionsResult.error }] };
    }

    let visions = visionsResult.data.data.visions.nodes;

    // If no vision found with isLeadership flag, try finding via leadership team
    if (visions.length === 0) {
      // Get the leadership team
      const teamsQuery = `
        query {
          teams(filter: {stateId: {equalTo: "${stateId}"}, isLeadership: {equalTo: true}}) {
            nodes {
              id
            }
            totalCount
          }
        }
      `;

      const teamsResult = await callSuccessCoGraphQL(teamsQuery);
      if (teamsResult.ok) {
        const teams = teamsResult.data.data.teams.nodes;
        if (teams.length > 0) {
          const leadershipTeamId = teams[0].id;

          // Now find vision by leadership team ID
          const visionsByTeamQuery = `
            query {
              visions(filter: {stateId: {equalTo: "${stateId}"}, teamId: {equalTo: "${leadershipTeamId}"}}) {
                nodes {
                  id
                  teamId
                  isLeadership
                  createdAt
                  stateId
                  companyId
                }
                totalCount
              }
            }
          `;

          const visionsByTeamResult = await callSuccessCoGraphQL(
            visionsByTeamQuery
          );
          if (visionsByTeamResult.ok) {
            visions = visionsByTeamResult.data.data.visions.nodes;
          }
        }
      }
    }

    // If still no vision found, return error
    if (visions.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No leadership vision found. Please ensure you have a vision for the leadership team.",
          },
        ],
      };
    }

    const leadershipVision = visions[0];
    const visionId = leadershipVision.id;

    // Step 2: Fetch all VTO components in parallel
    const [
      coreValuesResult,
      coreFocusResult,
      threeYearGoalsResult,
      marketStrategiesResult,
    ] = await Promise.all([
      // Core Values
      callSuccessCoGraphQL(`
        query {
          visionCoreValues(filter: {stateId: {equalTo: "${stateId}"}, visionId: {equalTo: "${visionId}"}}) {
            nodes {
              id
              name
              cascadeAll
              visionId
              createdAt
              stateId
              companyId
            }
            totalCount
          }
        }
      `),

      // Core Focus Types
      callSuccessCoGraphQL(`
        query {
          visionCoreFocusTypes(filter: {stateId: {equalTo: "${stateId}"}, visionId: {equalTo: "${visionId}"}}) {
            nodes {
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
            totalCount
          }
        }
      `),

      // Three Year Goals
      callSuccessCoGraphQL(`
        query {
          visionThreeYearGoals(filter: {stateId: {equalTo: "${stateId}"}, visionId: {equalTo: "${visionId}"}}) {
            nodes {
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
            totalCount
          }
        }
      `),

      // Market Strategies
      callSuccessCoGraphQL(`
        query {
          visionMarketStrategies(filter: {stateId: {equalTo: "${stateId}"}, visionId: {equalTo: "${visionId}"}}) {
            nodes {
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
            totalCount
          }
        }
      `),
    ]);

    // Check for errors in any of the parallel requests
    const errors = [];
    if (!coreValuesResult.ok)
      errors.push(`Core Values: ${coreValuesResult.error}`);
    if (!coreFocusResult.ok)
      errors.push(`Core Focus: ${coreFocusResult.error}`);
    if (!threeYearGoalsResult.ok)
      errors.push(`Three Year Goals: ${threeYearGoalsResult.error}`);
    if (!marketStrategiesResult.ok)
      errors.push(`Market Strategies: ${marketStrategiesResult.error}`);

    if (errors.length > 0) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching VTO components: ${errors.join(", ")}`,
          },
        ],
      };
    }

    // Extract data from results
    const coreValues = coreValuesResult.data.data.visionCoreValues.nodes;
    const coreFocusTypes = coreFocusResult.data.data.visionCoreFocusTypes.nodes;
    const threeYearGoals =
      threeYearGoalsResult.data.data.visionThreeYearGoals.nodes;
    const marketStrategies =
      marketStrategiesResult.data.data.visionMarketStrategies.nodes;

    // Fetch core value details (the actual values like "Be awesome")
    let coreValueDetails = [];
    if (coreValues.length > 0) {
      const coreValueIds = coreValues.map((cv) => cv.id).filter(Boolean);
      if (coreValueIds.length > 0) {
        const coreValueDetailsQuery = `
          query {
            visionCoreValueDetails(filter: {stateId: {equalTo: "${stateId}"}, visionCoreValueId: {in: [${coreValueIds
          .map((id) => `"${id}"`)
          .join(", ")}]}}) {
              nodes {
                id
                name
                desc
                type
                position
                visionCoreValueId
                cascadeAll
              }
              totalCount
            }
          }
        `;

        const detailsResult = await callSuccessCoGraphQL(coreValueDetailsQuery);
        if (detailsResult.ok) {
          coreValueDetails =
            detailsResult.data.data.visionCoreValueDetails.nodes;
          // Sort by position
          coreValueDetails.sort((a, b) => a.position - b.position);
        }
      }
    }

    // Build comprehensive VTO summary
    let vtoSummary = `# Leadership Vision/Traction Organizer Summary\n\n`;
    vtoSummary += `**Vision ID:** ${leadershipVision.id}\n`;
    vtoSummary += `**Team ID:** ${leadershipVision.teamId}\n`;
    vtoSummary += `**Created:** ${new Date(
      leadershipVision.createdAt
    ).toLocaleDateString()}\n`;
    vtoSummary += `**Status:** ${leadershipVision.stateId}\n\n`;

    // Core Values Section - show actual values from details
    vtoSummary += `## Core Values\n`;
    // Only show core values if we have actual details defined
    // The parent records are just containers, the details are the actual values
    if (coreValueDetails.length > 0) {
      coreValueDetails.forEach((detail) => {
        if (detail.name) {
          vtoSummary += `• **${detail.name}**`;
          if (detail.desc) {
            const cleanDesc = detail.desc.replace(/<[^>]*>/g, "").trim();
            if (cleanDesc) {
              vtoSummary += ` - ${cleanDesc}`;
            }
          }
          // Check cascade from parent
          const parent = coreValues.find(
            (cv) => cv.id === detail.visionCoreValueId
          );
          if (parent) {
            vtoSummary += ` (${
              parent.cascadeAll ? "Cascades to all teams" : "Leadership only"
            })`;
          }
          vtoSummary += `\n`;
        }
      });
    } else {
      vtoSummary += `*No core values defined yet*\n`;
    }
    vtoSummary += `\n`;

    // Core Focus Types Section
    if (coreFocusTypes.length > 0) {
      vtoSummary += `## Core Focus\n`;
      coreFocusTypes.forEach((focus) => {
        vtoSummary += `• **${focus.name || focus.type}** (${focus.type})\n`;
        if (focus.desc) {
          // Clean up HTML tags from description
          const cleanDesc = focus.desc.replace(/<[^>]*>/g, "").trim();
          if (cleanDesc) {
            vtoSummary += `  - ${cleanDesc}\n`;
          }
        }
      });
      vtoSummary += `\n`;
    }

    // Three Year Goals Section
    if (threeYearGoals.length > 0) {
      vtoSummary += `## Goals & Planning\n`;
      threeYearGoals.forEach((goal) => {
        vtoSummary += `• **${goal.name}** (${goal.type})\n`;
        if (goal.futureDate) {
          vtoSummary += `  - Target Date: ${new Date(
            goal.futureDate
          ).toLocaleDateString()}\n`;
        }
      });
      vtoSummary += `\n`;
    }

    // Market Strategies Section
    if (marketStrategies.length > 0) {
      vtoSummary += `## Market Strategy\n`;
      marketStrategies.forEach((strategy) => {
        vtoSummary += `• **${strategy.name}**\n`;

        if (strategy.idealCustomer) {
          vtoSummary += `  - Target Market: ${strategy.idealCustomer}\n`;
        }

        if (strategy.idealCustomerDesc) {
          const cleanDesc = strategy.idealCustomerDesc
            .replace(/<[^>]*>/g, "")
            .trim();
          if (cleanDesc) {
            vtoSummary += `  - Market Description: ${cleanDesc}\n`;
          }
        }

        if (strategy.provenProcess) {
          vtoSummary += `  - Proven Process: ${strategy.provenProcess}\n`;
        }

        if (strategy.guarantee && strategy.showGuarantee) {
          vtoSummary += `  - Guarantee: ${strategy.guarantee}\n`;
          if (strategy.guaranteeDesc) {
            const cleanDesc = strategy.guaranteeDesc
              .replace(/<[^>]*>/g, "")
              .trim();
            if (cleanDesc) {
              vtoSummary += `    ${cleanDesc}\n`;
            }
          }
        }

        if (strategy.uniqueValueProposition) {
          vtoSummary += `  - Unique Value Proposition: ${strategy.uniqueValueProposition}\n`;
        }
      });
      vtoSummary += `\n`;
    }

    // Add summary statistics
    vtoSummary += `## Summary Statistics\n`;
    vtoSummary += `• Core Values: ${coreValueDetails.length}\n`;
    vtoSummary += `• Core Focus Items: ${coreFocusTypes.length}\n`;
    vtoSummary += `• Goals & Plans: ${threeYearGoals.length}\n`;
    vtoSummary += `• Market Strategies: ${marketStrategies.length}\n`;

    return {
      content: [
        {
          type: "text",
          text: vtoSummary,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching leadership VTO: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Update a VTO Core Value
 * @param {Object} args - Arguments object
 * @param {string} args.coreValueId - Core Value ID (required)
 * @param {string} [args.name] - Update core value name
 * @param {boolean} [args.cascadeAll] - Whether to cascade to all teams
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateVTOCoreValue(args) {
  const { coreValueId, name, cascadeAll } = args;

  if (!coreValueId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Core Value ID is required",
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
    mutation UpdateVisionCoreValue($input: UpdateVisionCoreValueInput!) {
      updateVisionCoreValue(input: $input) {
        visionCoreValue {
          id
          name
          cascadeAll
          visionId
          stateId
        }
      }
    }
  `;

  const updates = {};
  if (name) updates.name = name;
  if (cascadeAll !== undefined) updates.cascadeAll = cascadeAll;

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
      id: coreValueId,
      patch: updates,
    },
  };

  const result = await callSuccessCoGraphQL(mutation, variables);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error updating core value: ${result.error}`,
        },
      ],
    };
  }

  const updatedCoreValue =
    result.data?.data?.updateVisionCoreValue?.visionCoreValue;

  if (!updatedCoreValue) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Core value update failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `✅ Core value updated successfully!\n\n**ID:** ${updatedCoreValue.id}\n**Name:** ${updatedCoreValue.name || "N/A"}\n**Cascade to all teams:** ${updatedCoreValue.cascadeAll ? "Yes" : "No"}`,
      },
    ],
  };
}

/**
 * Update a VTO Core Value Detail (the actual core value like "Be awesome")
 * @param {Object} args - Arguments object
 * @param {string} args.coreValueDetailId - Core Value Detail ID (required)
 * @param {string} [args.name] - Update core value detail name
 * @param {string} [args.desc] - Update core value detail description
 * @param {number} [args.position] - Update position/order
 * @param {boolean} [args.cascadeAll] - Whether to cascade to all teams
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateVTOCoreValueDetail(args) {
  const { coreValueDetailId, name, desc, position, cascadeAll } = args;

  if (!coreValueDetailId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Core Value Detail ID is required",
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
    mutation UpdateVisionCoreValueDetail($input: UpdateVisionCoreValueDetailInput!) {
      updateVisionCoreValueDetail(input: $input) {
        visionCoreValueDetail {
          id
          name
          desc
          position
          cascadeAll
          visionCoreValueId
          stateId
        }
      }
    }
  `;

  const updates = {};
  if (name) updates.name = name;
  if (desc !== undefined) updates.desc = desc;
  if (position !== undefined) updates.position = position;
  if (cascadeAll !== undefined) updates.cascadeAll = cascadeAll;

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
      id: coreValueDetailId,
      patch: updates,
    },
  };

  const result = await callSuccessCoGraphQL(mutation, variables);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error updating core value detail: ${result.error}`,
        },
      ],
    };
  }

  const updatedDetail =
    result.data?.data?.updateVisionCoreValueDetail?.visionCoreValueDetail;

  if (!updatedDetail) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Core value detail update failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `✅ Core value detail updated successfully!\n\n**ID:** ${
          updatedDetail.id
        }\n**Name:** ${updatedDetail.name || "N/A"}\n**Description:** ${
          updatedDetail.desc || "N/A"
        }\n**Position:** ${updatedDetail.position}\n**Cascade to all teams:** ${
          updatedDetail.cascadeAll ? "Yes" : "No"
        }`,
      },
    ],
  };
}

/**
 * Update a VTO Core Focus Type
 * @param {Object} args - Arguments object
 * @param {string} args.coreFocusId - Core Focus Type ID (required)
 * @param {string} [args.name] - Update core focus name
 * @param {string} [args.desc] - Update core focus description
 * @param {string} [args.coreFocusName] - Update core focus name field
 * @param {boolean} [args.cascadeAll] - Whether to cascade to all teams
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateVTOCoreFocus(args) {
  const { coreFocusId, name, desc, coreFocusName, cascadeAll } = args;

  if (!coreFocusId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Core Focus ID is required",
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
    mutation UpdateVisionCoreFocusType($input: UpdateVisionCoreFocusTypeInput!) {
      updateVisionCoreFocusType(input: $input) {
        visionCoreFocusType {
          id
          name
          coreFocusName
          desc
          type
          cascadeAll
          visionId
          stateId
        }
      }
    }
  `;

  const updates = {};
  if (name) updates.name = name;
  if (desc !== undefined) updates.desc = desc;
  if (coreFocusName) updates.coreFocusName = coreFocusName;
  if (cascadeAll !== undefined) updates.cascadeAll = cascadeAll;

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
      id: coreFocusId,
      patch: updates,
    },
  };

  const result = await callSuccessCoGraphQL(mutation, variables);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error updating core focus: ${result.error}`,
        },
      ],
    };
  }

  const updatedCoreFocus =
    result.data?.data?.updateVisionCoreFocusType?.visionCoreFocusType;

  if (!updatedCoreFocus) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Core focus update failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `✅ Core focus updated successfully!\n\n**ID:** ${
          updatedCoreFocus.id
        }\n**Name:** ${updatedCoreFocus.name || "N/A"}\n**Core Focus Name:** ${
          updatedCoreFocus.coreFocusName || "N/A"
        }\n**Type:** ${updatedCoreFocus.type}\n**Description:** ${
          updatedCoreFocus.desc || "N/A"
        }\n**Cascade to all teams:** ${
          updatedCoreFocus.cascadeAll ? "Yes" : "No"
        }`,
      },
    ],
  };
}

/**
 * Update a VTO Three Year Goal
 * @param {Object} args - Arguments object
 * @param {string} args.goalId - Three Year Goal ID (required)
 * @param {string} [args.name] - Update goal name
 * @param {string} [args.futureDate] - Update target date (ISO date string)
 * @param {boolean} [args.cascadeAll] - Whether to cascade to all teams
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateVTOThreeYearGoal(args) {
  const { goalId, name, futureDate, cascadeAll } = args;

  if (!goalId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Goal ID is required",
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
    mutation UpdateVisionThreeYearGoal($input: UpdateVisionThreeYearGoalInput!) {
      updateVisionThreeYearGoal(input: $input) {
        visionThreeYearGoal {
          id
          name
          futureDate
          type
          cascadeAll
          visionId
          stateId
        }
      }
    }
  `;

  const updates = {};
  if (name) updates.name = name;
  if (futureDate) updates.futureDate = futureDate;
  if (cascadeAll !== undefined) updates.cascadeAll = cascadeAll;

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
      id: goalId,
      patch: updates,
    },
  };

  const result = await callSuccessCoGraphQL(mutation, variables);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error updating goal: ${result.error}`,
        },
      ],
    };
  }

  const updatedGoal =
    result.data?.data?.updateVisionThreeYearGoal?.visionThreeYearGoal;

  if (!updatedGoal) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Goal update failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `✅ Three-year goal updated successfully!\n\n**ID:** ${
          updatedGoal.id
        }\n**Name:** ${updatedGoal.name || "N/A"}\n**Target Date:** ${
          updatedGoal.futureDate
            ? new Date(updatedGoal.futureDate).toLocaleDateString()
            : "N/A"
        }\n**Type:** ${updatedGoal.type}\n**Cascade to all teams:** ${
          updatedGoal.cascadeAll ? "Yes" : "No"
        }`,
      },
    ],
  };
}

/**
 * Update a VTO Market Strategy
 * @param {Object} args - Arguments object
 * @param {string} args.marketStrategyId - Market Strategy ID (required)
 * @param {string} [args.name] - Update strategy name
 * @param {string} [args.idealCustomer] - Update target market/ideal customer
 * @param {string} [args.idealCustomerDesc] - Update ideal customer description
 * @param {string} [args.provenProcess] - Update proven process
 * @param {string} [args.provenProcessDesc] - Update proven process description
 * @param {string} [args.guarantee] - Update guarantee
 * @param {string} [args.guaranteeDesc] - Update guarantee description
 * @param {string} [args.uniqueValueProposition] - Update unique value proposition
 * @param {boolean} [args.showProvenProcess] - Whether to show proven process
 * @param {boolean} [args.showGuarantee] - Whether to show guarantee
 * @param {boolean} [args.cascadeAll] - Whether to cascade to all teams
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateVTOMarketStrategy(args) {
  const {
    marketStrategyId,
    name,
    idealCustomer,
    idealCustomerDesc,
    provenProcess,
    provenProcessDesc,
    guarantee,
    guaranteeDesc,
    uniqueValueProposition,
    showProvenProcess,
    showGuarantee,
    cascadeAll,
  } = args;

  if (!marketStrategyId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Market Strategy ID is required",
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
    mutation UpdateVisionMarketStrategy($input: UpdateVisionMarketStrategyInput!) {
      updateVisionMarketStrategy(input: $input) {
        visionMarketStrategy {
          id
          name
          idealCustomer
          idealCustomerDesc
          provenProcess
          provenProcessDesc
          guarantee
          guaranteeDesc
          uniqueValueProposition
          showProvenProcess
          showGuarantee
          cascadeAll
          visionId
          stateId
        }
      }
    }
  `;

  const updates = {};
  if (name) updates.name = name;
  if (idealCustomer !== undefined) updates.idealCustomer = idealCustomer;
  if (idealCustomerDesc !== undefined)
    updates.idealCustomerDesc = idealCustomerDesc;
  if (provenProcess !== undefined) updates.provenProcess = provenProcess;
  if (provenProcessDesc !== undefined)
    updates.provenProcessDesc = provenProcessDesc;
  if (guarantee !== undefined) updates.guarantee = guarantee;
  if (guaranteeDesc !== undefined) updates.guaranteeDesc = guaranteeDesc;
  if (uniqueValueProposition !== undefined)
    updates.uniqueValueProposition = uniqueValueProposition;
  if (showProvenProcess !== undefined)
    updates.showProvenProcess = showProvenProcess;
  if (showGuarantee !== undefined) updates.showGuarantee = showGuarantee;
  if (cascadeAll !== undefined) updates.cascadeAll = cascadeAll;

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
      id: marketStrategyId,
      patch: updates,
    },
  };

  const result = await callSuccessCoGraphQL(mutation, variables);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error updating market strategy: ${result.error}`,
        },
      ],
    };
  }

  const updatedStrategy =
    result.data?.data?.updateVisionMarketStrategy?.visionMarketStrategy;

  if (!updatedStrategy) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Market strategy update failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `✅ Market strategy updated successfully!\n\n**ID:** ${
          updatedStrategy.id
        }\n**Name:** ${updatedStrategy.name || "N/A"}\n**Target Market:** ${
          updatedStrategy.idealCustomer || "N/A"
        }\n**Unique Value Proposition:** ${
          updatedStrategy.uniqueValueProposition || "N/A"
        }\n**Proven Process:** ${
          updatedStrategy.provenProcess || "N/A"
        }\n**Guarantee:** ${
          updatedStrategy.guarantee || "N/A"
        }\n**Cascade to all teams:** ${
          updatedStrategy.cascadeAll ? "Yes" : "No"
        }`,
      },
    ],
  };
}
