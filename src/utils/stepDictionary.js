/**
 * Step Dictionary Utility for Module 12 (Smart Intellisense & Autocomplete)
 * Collects, indexes, and provides autocomplete suggestions for Given/When/Then steps.
 */

const COMMON_STEP_LIBRARY = [
  // Given Steps
  { keyword: 'Given', text: 'I am logged in as a verified user' },
  { keyword: 'Given', text: 'I navigate to the application homepage' },
  { keyword: 'Given', text: 'I am on the user authentication page' },
  { keyword: 'Given', text: 'the system database is initialized with seed data' },
  { keyword: 'Given', text: 'I have a valid item in my shopping cart' },
  { keyword: 'Given', text: 'the API server is running on localhost' },
  { keyword: 'Given', text: 'the user account balance is sufficient' },

  // When Steps
  { keyword: 'When', text: 'I enter valid login credentials' },
  { keyword: 'When', text: 'I click the submit button' },
  { keyword: 'When', text: 'I fill in the registration form with valid details' },
  { keyword: 'When', text: 'I send a POST request to the API endpoint' },
  { keyword: 'When', text: 'I proceed to checkout and enter payment details' },
  { keyword: 'When', text: 'I search for an item in the search bar' },
  { keyword: 'When', text: 'I attempt to login with invalid password' },

  // Then Steps
  { keyword: 'Then', text: 'I should be redirected to the dashboard' },
  { keyword: 'Then', text: 'an order confirmation message is displayed' },
  { keyword: 'Then', text: 'the response status code should be 200' },
  { keyword: 'Then', text: 'an error notification is shown to the user' },
  { keyword: 'Then', text: 'I receive an email confirmation receipt' },
  { keyword: 'Then', text: 'the database record is updated successfully' },
  { keyword: 'Then', text: 'the shopping cart badge displays 1 item' }
];

export function getStepSuggestions(currentCode, activeLineText) {
  if (!activeLineText) return [];

  const trimmed = activeLineText.trimStart();
  const kwMatch = trimmed.match(/^(Given|When|Then|And|But)\s*(.*)/i);

  if (!kwMatch) return [];

  const keyword = kwMatch[1].toUpperCase();
  const typedText = kwMatch[2].toLowerCase();

  // Index steps from current document code
  const documentSteps = [];
  if (currentCode) {
    const lines = currentCode.split(/\r?\n/);
    lines.forEach(l => {
      const match = l.trim().match(/^(Given|When|Then|And|But)\s+(.*)/i);
      if (match) {
        documentSteps.push({
          keyword: match[1],
          text: match[2].trim()
        });
      }
    });
  }

  // Combine document steps + common library
  const allSteps = [...documentSteps, ...COMMON_STEP_LIBRARY];
  const uniqueSteps = new Map();

  allSteps.forEach(st => {
    const key = `${st.text.toLowerCase()}`;
    if (!uniqueSteps.has(key)) {
      uniqueSteps.set(key, st);
    }
  });

  const candidates = Array.from(uniqueSteps.values());

  // Filter candidates matching typed text
  const filtered = candidates.filter(st => {
    if (!typedText) return true;
    return st.text.toLowerCase().includes(typedText);
  });

  return filtered.slice(0, 5);
}
