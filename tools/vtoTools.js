// Vision/Traction Organizer (VTO) Tools
// Tools for working with company vision, core values, core focus, goals, and strategies

import { callSuccessCoGraphQL } from "./core.js";
import { validateStateId } from "../utils/helpers.js";
import { getAuthContext } from "./core.js";

/**
 * Helper function to find the leadership vision ID
 * @returns {Promise<{visionId: string, error?: string}>}
 */
async function findLeadershipVisionId() {
  try {
    // First, try to find vision with isLeadership: true
    const visionsQuery = `
      query {
        visions(filter: {stateId: {equalTo: "ACTIVE"}, isLeadership: {equalTo: true}}) {
          nodes {
            id
            teamId
          }
          totalCount
        }
      }
    `;

    const visionsResult = await callSuccessCoGraphQL(visionsQuery);
    if (!visionsResult.ok) {
      return { visionId: null, error: visionsResult.error };
    }

    let visions = visionsResult.data.data.visions.nodes;

    // If no vision found with isLeadership flag, try finding via leadership team
    if (visions.length === 0) {
      const teamsQuery = `
        query {
          teams(filter: {stateId: {equalTo: "ACTIVE"}, isLeadership: {equalTo: true}}) {
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

          const visionsByTeamQuery = `
            query {
              visions(filter: {stateId: {equalTo: "ACTIVE"}, teamId: {equalTo: "${leadershipTeamId}"}}) {
                nodes {
                  id
                  teamId
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

    if (visions.length === 0) {
      return {
        visionId: null,
        error:
          "No leadership vision found. Please ensure you have a vision for the leadership team.",
      };
    }

    return { visionId: visions[0].id };
  } catch (error) {
    return { visionId: null, error: error.message };
  }
}

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
          vtoSummary += `• **${detail.name}** (ID: \`${detail.id}\`)`;
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
        vtoSummary += `• **${focus.name || focus.type}** (${focus.type}) - ID: \`${focus.id}\`\n`;
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
        vtoSummary += `• **${goal.name}** (${goal.type}) - ID: \`${goal.id}\`\n`;
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
        vtoSummary += `• **${strategy.name}** (ID: \`${strategy.id}\`)\n`;

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
 * Create a new core value detail for the leadership vision
 * @param {Object} args - Arguments object
 * @param {string} args.name - Core value name (e.g., "Be Awesome")
 * @param {string} args.desc - Optional description
 * @param {number} args.position - Optional position/order (defaults to 20000)
 * @param {boolean} args.cascadeAll - Whether to cascade to all teams (defaults to false)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function createCoreValue(args) {
  const { name, desc = "", position = 20000, cascadeAll = false } = args;

  if (!name) {
    return {
      content: [
        { type: "text", text: "Error: Core value name is required." },
      ],
    };
  }

  try {
    const auth = getAuthContext();
    if (!auth || !auth.companyId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: No authentication context found. Please authenticate first.",
          },
        ],
      };
    }

    // Find leadership vision
    const { visionId, error } = await findLeadershipVisionId();
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error}` }] };
    }

    // First create or get the parent core value container
    const createParentMutation = `
      mutation {
        createVisionCoreValue(input: {
          visionCoreValue: {
            name: ""
            visionId: "${visionId}"
            companyId: "${auth.companyId}"
            cascadeAll: ${cascadeAll}
            stateId: "ACTIVE"
          }
        }) {
          visionCoreValue {
            id
          }
        }
      }
    `;

    const parentResult = await callSuccessCoGraphQL(createParentMutation);
    if (!parentResult.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating core value container: ${parentResult.error}`,
          },
        ],
      };
    }

    const parentId =
      parentResult.data.data.createVisionCoreValue.visionCoreValue.id;

    // Now create the detail with the actual value
    const createDetailMutation = `
      mutation {
        createVisionCoreValueDetail(input: {
          visionCoreValueDetail: {
            name: ${JSON.stringify(name)}
            desc: ${JSON.stringify(desc)}
            position: ${position}
            visionCoreValueId: "${parentId}"
            companyId: "${auth.companyId}"
            type: ""
            stateId: "ACTIVE"
          }
        }) {
          visionCoreValueDetail {
            id
            name
            desc
            position
          }
        }
      }
    `;

    const detailResult = await callSuccessCoGraphQL(createDetailMutation);
    if (!detailResult.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating core value detail: ${detailResult.error}`,
          },
        ],
      };
    }

    const detail =
      detailResult.data.data.createVisionCoreValueDetail.visionCoreValueDetail;

    return {
      content: [
        {
          type: "text",
          text: `✓ Created core value: "${detail.name}"\nID: ${detail.id}\nPosition: ${detail.position}${cascadeAll ? "\nCascades to all teams" : ""}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error creating core value: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Update an existing core value detail
 * @param {Object} args - Arguments object
 * @param {string} args.coreValueId - Core value detail ID (required)
 * @param {string} args.name - Updated name
 * @param {string} args.desc - Updated description
 * @param {number} args.position - Updated position/order
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateCoreValue(args) {
  const { coreValueId, name, desc, position } = args;

  if (!coreValueId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Core value ID (coreValueId) is required. Use getLeadershipVTO to find the core value ID.",
        },
      ],
    };
  }

  if (!name && !desc && position === undefined) {
    return {
      content: [
        {
          type: "text",
          text: "Error: At least one field to update (name, desc, or position) is required.",
        },
      ],
    };
  }

  try {
    // Build the patch object
    const patchFields = [];
    if (name !== undefined)
      patchFields.push(`name: ${JSON.stringify(name)}`);
    if (desc !== undefined) patchFields.push(`desc: ${JSON.stringify(desc)}`);
    if (position !== undefined) patchFields.push(`position: ${position}`);

    const updateMutation = `
      mutation {
        updateVisionCoreValueDetail(input: {
          id: "${coreValueId}"
          patch: {
            ${patchFields.join("\n            ")}
          }
        }) {
          visionCoreValueDetail {
            id
            name
            desc
            position
          }
        }
      }
    `;

    const result = await callSuccessCoGraphQL(updateMutation);
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

    const detail =
      result.data.data.updateVisionCoreValueDetail.visionCoreValueDetail;

    return {
      content: [
        {
          type: "text",
          text: `✓ Updated core value: "${detail.name}"\nID: ${detail.id}\nPosition: ${detail.position}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error updating core value: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Delete a core value detail (soft delete by setting state to DELETED)
 * @param {Object} args - Arguments object
 * @param {string} args.coreValueId - Core value detail ID (required)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function deleteCoreValue(args) {
  const { coreValueId } = args;

  if (!coreValueId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Core value ID (coreValueId) is required. Use getLeadershipVTO to find the core value ID.",
        },
      ],
    };
  }

  try {
    const updateMutation = `
      mutation {
        updateVisionCoreValueDetail(input: {
          id: "${coreValueId}"
          patch: {
            stateId: "DELETED"
          }
        }) {
          visionCoreValueDetail {
            id
            name
            stateId
          }
        }
      }
    `;

    const result = await callSuccessCoGraphQL(updateMutation);
    if (!result.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error deleting core value: ${result.error}`,
          },
        ],
      };
    }

    const detail =
      result.data.data.updateVisionCoreValueDetail.visionCoreValueDetail;

    return {
      content: [
        {
          type: "text",
          text: `✓ Deleted core value: "${detail.name}" (ID: ${detail.id})`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error deleting core value: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Create a new core focus item
 * @param {Object} args - Arguments object
 * @param {string} args.name - Focus name
 * @param {string} args.type - Focus type (e.g., "PURPOSE", "NICHE", "CORE_FOCUS")
 * @param {string} args.desc - Description
 * @param {string} args.coreFocusName - Core focus name (optional)
 * @param {boolean} args.cascadeAll - Whether to cascade to all teams (defaults to false)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function createCoreFocus(args) {
  const {
    name,
    type = "CORE_FOCUS",
    desc = "",
    coreFocusName = "",
    cascadeAll = false,
  } = args;

  if (!name) {
    return {
      content: [{ type: "text", text: "Error: Core focus name is required." }],
    };
  }

  try {
    const auth = getAuthContext();
    if (!auth || !auth.companyId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: No authentication context found. Please authenticate first.",
          },
        ],
      };
    }

    // Find leadership vision
    const { visionId, error } = await findLeadershipVisionId();
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error}` }] };
    }

    const createMutation = `
      mutation {
        createVisionCoreFocusType(input: {
          visionCoreFocusType: {
            name: ${JSON.stringify(name)}
            type: ${JSON.stringify(type)}
            desc: ${JSON.stringify(desc)}
            coreFocusName: ${JSON.stringify(coreFocusName)}
            visionId: "${visionId}"
            companyId: "${auth.companyId}"
            cascadeAll: ${cascadeAll}
            src: ""
            stateId: "ACTIVE"
          }
        }) {
          visionCoreFocusType {
            id
            name
            type
            desc
          }
        }
      }
    `;

    const result = await callSuccessCoGraphQL(createMutation);
    if (!result.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating core focus: ${result.error}`,
          },
        ],
      };
    }

    const focus =
      result.data.data.createVisionCoreFocusType.visionCoreFocusType;

    return {
      content: [
        {
          type: "text",
          text: `✓ Created core focus: "${focus.name}" (${focus.type})\nID: ${focus.id}${cascadeAll ? "\nCascades to all teams" : ""}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error creating core focus: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Update an existing core focus item
 * @param {Object} args - Arguments object
 * @param {string} args.coreFocusId - Core focus ID (required)
 * @param {string} args.name - Updated name
 * @param {string} args.desc - Updated description
 * @param {string} args.type - Updated type
 * @param {string} args.coreFocusName - Updated core focus name
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateCoreFocus(args) {
  const { coreFocusId, name, desc, type, coreFocusName } = args;

  if (!coreFocusId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Core focus ID (coreFocusId) is required. Use getLeadershipVTO to find the core focus ID.",
        },
      ],
    };
  }

  if (!name && !desc && !type && !coreFocusName) {
    return {
      content: [
        {
          type: "text",
          text: "Error: At least one field to update (name, desc, type, or coreFocusName) is required.",
        },
      ],
    };
  }

  try {
    const patchFields = [];
    if (name !== undefined)
      patchFields.push(`name: ${JSON.stringify(name)}`);
    if (desc !== undefined) patchFields.push(`desc: ${JSON.stringify(desc)}`);
    if (type !== undefined) patchFields.push(`type: ${JSON.stringify(type)}`);
    if (coreFocusName !== undefined)
      patchFields.push(`coreFocusName: ${JSON.stringify(coreFocusName)}`);

    const updateMutation = `
      mutation {
        updateVisionCoreFocusType(input: {
          id: "${coreFocusId}"
          patch: {
            ${patchFields.join("\n            ")}
          }
        }) {
          visionCoreFocusType {
            id
            name
            type
            desc
          }
        }
      }
    `;

    const result = await callSuccessCoGraphQL(updateMutation);
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

    const focus =
      result.data.data.updateVisionCoreFocusType.visionCoreFocusType;

    return {
      content: [
        {
          type: "text",
          text: `✓ Updated core focus: "${focus.name}" (${focus.type})\nID: ${focus.id}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error updating core focus: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Delete a core focus item (soft delete)
 * @param {Object} args - Arguments object
 * @param {string} args.coreFocusId - Core focus ID (required)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function deleteCoreFocus(args) {
  const { coreFocusId } = args;

  if (!coreFocusId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Core focus ID (coreFocusId) is required. Use getLeadershipVTO to find the core focus ID.",
        },
      ],
    };
  }

  try {
    const updateMutation = `
      mutation {
        updateVisionCoreFocusType(input: {
          id: "${coreFocusId}"
          patch: {
            stateId: "DELETED"
          }
        }) {
          visionCoreFocusType {
            id
            name
            stateId
          }
        }
      }
    `;

    const result = await callSuccessCoGraphQL(updateMutation);
    if (!result.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error deleting core focus: ${result.error}`,
          },
        ],
      };
    }

    const focus =
      result.data.data.updateVisionCoreFocusType.visionCoreFocusType;

    return {
      content: [
        {
          type: "text",
          text: `✓ Deleted core focus: "${focus.name}" (ID: ${focus.id})`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error deleting core focus: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Create a new three-year goal
 * @param {Object} args - Arguments object
 * @param {string} args.name - Goal name/description
 * @param {string} args.type - Goal type (e.g., "3_YEAR_PICTURE", "1_YEAR_PLAN", "90_DAY_PLAN")
 * @param {string} args.futureDate - Target date (YYYY-MM-DD format)
 * @param {boolean} args.cascadeAll - Whether to cascade to all teams (defaults to false)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function createVTOGoal(args) {
  const { name, type = "3_YEAR_PICTURE", futureDate, cascadeAll = false } =
    args;

  if (!name) {
    return {
      content: [{ type: "text", text: "Error: Goal name is required." }],
    };
  }

  try {
    const auth = getAuthContext();
    if (!auth || !auth.companyId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: No authentication context found. Please authenticate first.",
          },
        ],
      };
    }

    // Find leadership vision
    const { visionId, error } = await findLeadershipVisionId();
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error}` }] };
    }

    const createMutation = `
      mutation {
        createVisionThreeYearGoal(input: {
          visionThreeYearGoal: {
            name: ${JSON.stringify(name)}
            type: ${JSON.stringify(type)}
            ${futureDate ? `futureDate: "${futureDate}"` : ""}
            visionId: "${visionId}"
            companyId: "${auth.companyId}"
            cascadeAll: ${cascadeAll}
            stateId: "ACTIVE"
          }
        }) {
          visionThreeYearGoal {
            id
            name
            type
            futureDate
          }
        }
      }
    `;

    const result = await callSuccessCoGraphQL(createMutation);
    if (!result.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating VTO goal: ${result.error}`,
          },
        ],
      };
    }

    const goal =
      result.data.data.createVisionThreeYearGoal.visionThreeYearGoal;

    return {
      content: [
        {
          type: "text",
          text: `✓ Created VTO goal: "${goal.name}" (${goal.type})\nID: ${goal.id}${goal.futureDate ? `\nTarget Date: ${new Date(goal.futureDate).toLocaleDateString()}` : ""}${cascadeAll ? "\nCascades to all teams" : ""}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error creating VTO goal: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Update an existing VTO goal
 * @param {Object} args - Arguments object
 * @param {string} args.goalId - Goal ID (required)
 * @param {string} args.name - Updated name
 * @param {string} args.type - Updated type
 * @param {string} args.futureDate - Updated target date (YYYY-MM-DD)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateVTOGoal(args) {
  const { goalId, name, type, futureDate } = args;

  if (!goalId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Goal ID (goalId) is required. Use getLeadershipVTO to find the goal ID.",
        },
      ],
    };
  }

  if (!name && !type && !futureDate) {
    return {
      content: [
        {
          type: "text",
          text: "Error: At least one field to update (name, type, or futureDate) is required.",
        },
      ],
    };
  }

  try {
    const patchFields = [];
    if (name !== undefined)
      patchFields.push(`name: ${JSON.stringify(name)}`);
    if (type !== undefined) patchFields.push(`type: ${JSON.stringify(type)}`);
    if (futureDate !== undefined)
      patchFields.push(`futureDate: "${futureDate}"`);

    const updateMutation = `
      mutation {
        updateVisionThreeYearGoal(input: {
          id: "${goalId}"
          patch: {
            ${patchFields.join("\n            ")}
          }
        }) {
          visionThreeYearGoal {
            id
            name
            type
            futureDate
          }
        }
      }
    `;

    const result = await callSuccessCoGraphQL(updateMutation);
    if (!result.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error updating VTO goal: ${result.error}`,
          },
        ],
      };
    }

    const goal =
      result.data.data.updateVisionThreeYearGoal.visionThreeYearGoal;

    return {
      content: [
        {
          type: "text",
          text: `✓ Updated VTO goal: "${goal.name}" (${goal.type})\nID: ${goal.id}${goal.futureDate ? `\nTarget Date: ${new Date(goal.futureDate).toLocaleDateString()}` : ""}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error updating VTO goal: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Delete a VTO goal (soft delete)
 * @param {Object} args - Arguments object
 * @param {string} args.goalId - Goal ID (required)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function deleteVTOGoal(args) {
  const { goalId } = args;

  if (!goalId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Goal ID (goalId) is required. Use getLeadershipVTO to find the goal ID.",
        },
      ],
    };
  }

  try {
    const updateMutation = `
      mutation {
        updateVisionThreeYearGoal(input: {
          id: "${goalId}"
          patch: {
            stateId: "DELETED"
          }
        }) {
          visionThreeYearGoal {
            id
            name
            stateId
          }
        }
      }
    `;

    const result = await callSuccessCoGraphQL(updateMutation);
    if (!result.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error deleting VTO goal: ${result.error}`,
          },
        ],
      };
    }

    const goal =
      result.data.data.updateVisionThreeYearGoal.visionThreeYearGoal;

    return {
      content: [
        {
          type: "text",
          text: `✓ Deleted VTO goal: "${goal.name}" (ID: ${goal.id})`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error deleting VTO goal: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Create a new market strategy
 * @param {Object} args - Arguments object
 * @param {string} args.name - Strategy name
 * @param {string} args.idealCustomer - Target market/ideal customer
 * @param {string} args.idealCustomerDesc - Description of ideal customer
 * @param {string} args.provenProcess - Proven process/methodology
 * @param {string} args.provenProcessDesc - Description of proven process
 * @param {string} args.guarantee - Guarantee
 * @param {string} args.guaranteeDesc - Description of guarantee
 * @param {string} args.uniqueValueProposition - Unique value proposition
 * @param {boolean} args.showProvenProcess - Show proven process (defaults to true)
 * @param {boolean} args.showGuarantee - Show guarantee (defaults to true)
 * @param {boolean} args.cascadeAll - Whether to cascade to all teams (defaults to false)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function createMarketStrategy(args) {
  const {
    name,
    idealCustomer = "",
    idealCustomerDesc = "",
    provenProcess = "",
    provenProcessDesc = "",
    guarantee = "",
    guaranteeDesc = "",
    uniqueValueProposition = "",
    showProvenProcess = true,
    showGuarantee = true,
    cascadeAll = false,
  } = args;

  if (!name) {
    return {
      content: [
        { type: "text", text: "Error: Market strategy name is required." },
      ],
    };
  }

  try {
    const auth = getAuthContext();
    if (!auth || !auth.companyId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: No authentication context found. Please authenticate first.",
          },
        ],
      };
    }

    // Find leadership vision
    const { visionId, error } = await findLeadershipVisionId();
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error}` }] };
    }

    const createMutation = `
      mutation {
        createVisionMarketStrategy(input: {
          visionMarketStrategy: {
            name: ${JSON.stringify(name)}
            idealCustomer: ${JSON.stringify(idealCustomer)}
            idealCustomerDesc: ${JSON.stringify(idealCustomerDesc)}
            provenProcess: ${JSON.stringify(provenProcess)}
            provenProcessDesc: ${JSON.stringify(provenProcessDesc)}
            guarantee: ${JSON.stringify(guarantee)}
            guaranteeDesc: ${JSON.stringify(guaranteeDesc)}
            uniqueValueProposition: ${JSON.stringify(uniqueValueProposition)}
            showProvenProcess: ${showProvenProcess}
            showGuarantee: ${showGuarantee}
            visionId: "${visionId}"
            companyId: "${auth.companyId}"
            cascadeAll: ${cascadeAll}
            isCustom: 0
            stateId: "ACTIVE"
          }
        }) {
          visionMarketStrategy {
            id
            name
            idealCustomer
            uniqueValueProposition
          }
        }
      }
    `;

    const result = await callSuccessCoGraphQL(createMutation);
    if (!result.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating market strategy: ${result.error}`,
          },
        ],
      };
    }

    const strategy =
      result.data.data.createVisionMarketStrategy.visionMarketStrategy;

    return {
      content: [
        {
          type: "text",
          text: `✓ Created market strategy: "${strategy.name}"\nID: ${strategy.id}${strategy.idealCustomer ? `\nTarget Market: ${strategy.idealCustomer}` : ""}${strategy.uniqueValueProposition ? `\nUnique Value Proposition: ${strategy.uniqueValueProposition}` : ""}${cascadeAll ? "\nCascades to all teams" : ""}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error creating market strategy: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Update an existing market strategy
 * @param {Object} args - Arguments object
 * @param {string} args.strategyId - Strategy ID (required)
 * @param {string} args.name - Updated name
 * @param {string} args.idealCustomer - Updated target market
 * @param {string} args.idealCustomerDesc - Updated ideal customer description
 * @param {string} args.provenProcess - Updated proven process
 * @param {string} args.provenProcessDesc - Updated proven process description
 * @param {string} args.guarantee - Updated guarantee
 * @param {string} args.guaranteeDesc - Updated guarantee description
 * @param {string} args.uniqueValueProposition - Updated unique value proposition
 * @param {boolean} args.showProvenProcess - Show proven process
 * @param {boolean} args.showGuarantee - Show guarantee
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateMarketStrategy(args) {
  const {
    strategyId,
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
  } = args;

  if (!strategyId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Strategy ID (strategyId) is required. Use getLeadershipVTO to find the strategy ID.",
        },
      ],
    };
  }

  if (
    !name &&
    !idealCustomer &&
    !idealCustomerDesc &&
    !provenProcess &&
    !provenProcessDesc &&
    !guarantee &&
    !guaranteeDesc &&
    !uniqueValueProposition &&
    showProvenProcess === undefined &&
    showGuarantee === undefined
  ) {
    return {
      content: [
        {
          type: "text",
          text: "Error: At least one field to update is required.",
        },
      ],
    };
  }

  try {
    const patchFields = [];
    if (name !== undefined)
      patchFields.push(`name: ${JSON.stringify(name)}`);
    if (idealCustomer !== undefined)
      patchFields.push(`idealCustomer: ${JSON.stringify(idealCustomer)}`);
    if (idealCustomerDesc !== undefined)
      patchFields.push(
        `idealCustomerDesc: ${JSON.stringify(idealCustomerDesc)}`
      );
    if (provenProcess !== undefined)
      patchFields.push(`provenProcess: ${JSON.stringify(provenProcess)}`);
    if (provenProcessDesc !== undefined)
      patchFields.push(
        `provenProcessDesc: ${JSON.stringify(provenProcessDesc)}`
      );
    if (guarantee !== undefined)
      patchFields.push(`guarantee: ${JSON.stringify(guarantee)}`);
    if (guaranteeDesc !== undefined)
      patchFields.push(`guaranteeDesc: ${JSON.stringify(guaranteeDesc)}`);
    if (uniqueValueProposition !== undefined)
      patchFields.push(
        `uniqueValueProposition: ${JSON.stringify(uniqueValueProposition)}`
      );
    if (showProvenProcess !== undefined)
      patchFields.push(`showProvenProcess: ${showProvenProcess}`);
    if (showGuarantee !== undefined)
      patchFields.push(`showGuarantee: ${showGuarantee}`);

    const updateMutation = `
      mutation {
        updateVisionMarketStrategy(input: {
          id: "${strategyId}"
          patch: {
            ${patchFields.join("\n            ")}
          }
        }) {
          visionMarketStrategy {
            id
            name
            idealCustomer
            uniqueValueProposition
          }
        }
      }
    `;

    const result = await callSuccessCoGraphQL(updateMutation);
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

    const strategy =
      result.data.data.updateVisionMarketStrategy.visionMarketStrategy;

    return {
      content: [
        {
          type: "text",
          text: `✓ Updated market strategy: "${strategy.name}"\nID: ${strategy.id}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error updating market strategy: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Delete a market strategy (soft delete)
 * @param {Object} args - Arguments object
 * @param {string} args.strategyId - Strategy ID (required)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function deleteMarketStrategy(args) {
  const { strategyId } = args;

  if (!strategyId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Strategy ID (strategyId) is required. Use getLeadershipVTO to find the strategy ID.",
        },
      ],
    };
  }

  try {
    const updateMutation = `
      mutation {
        updateVisionMarketStrategy(input: {
          id: "${strategyId}"
          patch: {
            stateId: "DELETED"
          }
        }) {
          visionMarketStrategy {
            id
            name
            stateId
          }
        }
      }
    `;

    const result = await callSuccessCoGraphQL(updateMutation);
    if (!result.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error deleting market strategy: ${result.error}`,
          },
        ],
      };
    }

    const strategy =
      result.data.data.updateVisionMarketStrategy.visionMarketStrategy;

    return {
      content: [
        {
          type: "text",
          text: `✓ Deleted market strategy: "${strategy.name}" (ID: ${strategy.id})`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error deleting market strategy: ${error.message}`,
        },
      ],
    };
  }
}
