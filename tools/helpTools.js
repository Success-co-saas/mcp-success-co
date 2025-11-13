// Help Tools
// Tools for helping users discover features and capabilities

/**
 * Get sample questions users can ask
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getSampleQuestions() {
  const sampleQuestions = {
    description:
      "Example questions you can ask about your Success.co EOS data. Feel free to ask in your own words!",
    categories: {
      "Vision / V/TO": [
        "Summarize our company's Vision/Traction Organizer in a few bullet points.",
        "What's our 10-year target, and how are we tracking against it?",
        "Show me our 3-year picture side-by-side with our current performance metrics.",
        "Are our quarterly Rocks aligned with our V/TO goals?",
      ],
      "Accountability Chart": [
        "Who reports to the Integrator?",
        "List everyone under the Sales and Marketing department with their roles.",
        "Who's accountable for lead generation KPIs?",
        "Show me any open roles or missing seats on the accountability chart.",
        "Create a summary of who's accountable for each company Rock.",
      ],
      "Scorecard": [
        "Show me this week's scorecard.",
        "Show me last week's scorecard.",
        "Which KPIs are off track for the last 3 weeks?",
        "What's our trend for revenue over the last quarter?",
        "List all metrics that are below target YTD.",
        "Give me a quick summary of scorecard performance and outliers.",
      ],
      "Rocks": [
        "Show me all company Rocks and their completion status.",
        "Which Rocks are off track or at risk this quarter?",
        "Who owns the Rock '[Rock name]' and what's its current status?",
        "Summarize the progress on all Rocks by department.",
        "What percentage of our Rocks are completed on time?",
      ],
      "To-Dos": [
        "List all of my open to-dos from our Level 10 meetings.",
        "Which to-dos are overdue?",
        "How many to-dos were completed last week?",
        "Create a summary of completed vs open to-dos for the leadership team.",
        "Which team has the highest completion rate for to-dos?",
      ],
      "Issues": [
        "Show me all issues from this week's meetings.",
        "Which issues have been stuck open for more than 2 weeks?",
        "Summarize issues by team or topic.",
        "What are the top 3 recurring issues across all departments?",
      ],
      "Meetings / Level 10": [
        "What were the headlines from our last leadership L10?",
        "Summarize last week's departmental meetings.",
        "How did each team score their last Level 10 meeting?",
        "What's the average meeting score for Q4?",
        "List all to-dos created in this week's meetings.",
      ],
      "Headlines": [
        "Show me all [team] team headlines from last L10.",
        "Get last weeks headlines",
        "List company headlines related to hiring.",
        "Summarize positive headlines from the past month.",
        "What headlines are related to client feedback?",
      ],
      "Organization Checkup": [
        "What's our current organization checkup score?",
        "Which question scored lowest?",
        "Compare this quarter's checkup to last quarter's.",
        "Summarize improvement areas for the next EOS quarter.",
      ],
      "Teams and People": [
        "Who's on the [Team] team?",
        "List all people with open Rocks.",
        "Who owns the KPI for [Measurable name]?",
        "Which team has the lowest Rock completion rate?",
        "Who in the business seems to be overloaded?",
      ],
      "Cross-functional / Insightful Queries": [
        "What's the overall health of our company this quarter?",
        "Summarize our EOS performance dashboard for the executive summary.",
        "Which areas of the business show the lowest accountability?",
        "Generate a leadership meeting agenda using current Rocks, Issues, and Scorecard data.",
        "Create a weekly EOS summary email with metrics, Rocks, and highlights.",
        "What's trending down in our scorecard that might affect our V/TO goals?",
      ],
      "Action / Automation-style Prompts": [
        "Add a new issue for '[Issue name]' to the leadership team.",
        "Create a long term issue 'EOS Knowledge for all employees'",
        "Close the issue about '[Issue name]'.",
        "Create a Rock '[Rock name]' for '[Team]' team due next quarter.",
        "Mark the to-do '[Todo name]' as complete.",
        "Add a headline: 'Won major client contract with ABC Corp.'",
        "Schedule a Level 10 meeting for the Leadership team for next Monday at 2pm.",
      ],
      "Analytic / Predictive Prompts": [
        "Based on current scorecard trends, which KPIs might miss target next quarter?",
        "Which teams have the strongest execution based on Rocks and To-Do completion?",
        "Correlate Rock completion rate with meeting scores.",
        "Identify people or teams consistently behind on their accountabilities.",
      ],
    },
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(sampleQuestions, null, 2),
      },
    ],
  };
}

