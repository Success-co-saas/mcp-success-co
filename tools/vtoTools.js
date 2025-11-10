// Vision/Traction Organizer (VTO) Tools
// Tools for working with company vision, core values, core focus, goals, and strategies

import { callSuccessCoGraphQL } from "./core.js";
import { validateStateId } from "../helpers.js";

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
          
          const visionsByTeamResult = await callSuccessCoGraphQL(visionsByTeamQuery);
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
      const coreValueIds = coreValues.map(cv => cv.id).filter(Boolean);
      if (coreValueIds.length > 0) {
        const coreValueDetailsQuery = `
          query {
            visionCoreValueDetails(filter: {stateId: {equalTo: "${stateId}"}, visionCoreValueId: {in: [${coreValueIds.map(id => `"${id}"`).join(", ")}]}}) {
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
          coreValueDetails = detailsResult.data.data.visionCoreValueDetails.nodes;
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
    if (coreValues.length > 0) {
      vtoSummary += `## Core Values\n`;
      
      // Display the actual core value details
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
            const parent = coreValues.find(cv => cv.id === detail.visionCoreValueId);
            if (parent) {
              vtoSummary += ` (${parent.cascadeAll ? "Cascades to all teams" : "Leadership only"})`;
            }
            vtoSummary += `\n`;
          }
        });
      } else {
        // Fallback to showing parent if no details found
        coreValues.forEach((value) => {
          vtoSummary += `• **${value.name}** (${
            value.cascadeAll ? "Cascades to all teams" : "Leadership only"
          })\n`;
        });
      }
      vtoSummary += `\n`;
    }

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
    vtoSummary += `• Core Values: ${coreValueDetails.length > 0 ? coreValueDetails.length : coreValues.length}\n`;
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
