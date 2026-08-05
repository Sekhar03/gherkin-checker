export const SAMPLES = [
  {
    id: 'valid',
    name: '✅ Valid Feature (Passes All 4 Checkers)',
    description: 'Clean Gherkin syntax adhering to standard Cucumber rules & linter guidelines.',
    code: `Feature: E-Commerce Shopping Cart Checkout
  As a registered user of the online store
  I want to add products to my shopping cart
  So that I can purchase items securely

  @smoke @checkout
  Scenario: Successfully add a product to cart and verify total
    Given the user is logged into their account
    And the user has an empty shopping cart
    When the user navigates to the "Laptops" category
    And selects the product "Pro Laptop 15" with price "$1200"
    And clicks the "Add to Cart" button
    Then the shopping cart should contain 1 item
    And the cart total amount should be "$1200"

  @regression
  Scenario Outline: Applying promotional discount codes
    Given the user has items in the cart totaling "<original_price>"
    When the user enters coupon code "<coupon_code>"
    Then the discount applied should be "<discount>"
    And the final price should be "<final_price>"

    Examples:
      | original_price | coupon_code | discount | final_price |
      | $100           | SAVE10      | 10%      | $90         |
      | $200           | SAVE20      | 20%      | $160        |
`
  },
  {
    id: 'cucumber_official',
    name: '🥒 Official Cucumber Spec (Gherkin 6+ Rules)',
    description: 'Official Cucumber standard fixture with Rule blocks, Backgrounds, and Example synonyms.',
    code: `Feature: Customer Membership Tier Management
  As a loyalty program manager
  I want to calculate tier upgrades and benefits
  So that active members receive appropriate perks

  Background:
    Given the customer membership database is initialized
    And standard discount rates are loaded

  Rule: Gold Tier Qualification Rule
    Members with over 1000 points qualify for Gold benefits

    Example: Tier upgrade upon reaching threshold
      Given customer "Alice" has 950 points
      When customer "Alice" makes a purchase worth 100 points
      Then customer "Alice" total points should be 1050
      And customer "Alice" membership status should be upgraded to "Gold"

  Rule: Platinum Tier Qualification Rule
    Members with over 5000 points qualify for Platinum benefits

    Scenario Outline: Bulk tier calculation for high volume shoppers
      Given customer "<CustomerName>" has points "<InitialPoints>"
      When customer "<CustomerName>" completes a transaction of "<NewPoints>" points
      Then customer "<CustomerName>" final tier should be "<FinalTier>"

      Examples:
        | CustomerName | InitialPoints | NewPoints | FinalTier |
        | Bob          | 4800          | 300       | Platinum  |
        | Charlie      | 2000          | 3500      | Platinum  |
`
  },
  {
    id: 'cucumber_docstrings',
    name: '📄 Official Cucumber DataTables & DocStrings Spec',
    description: 'Official Cucumber spec showcasing multiline DocString blocks and pipe DataTables.',
    code: `Feature: API Webhook Notification Processing

  Scenario: Receive and process JSON webhook payload
    Given the API webhook endpoint "https://api.merchant.com/webhooks" is active
    When a HTTP POST request is received with body:
      """
      {
        "event": "payment_completed",
        "transactionId": "TXN_987654",
        "amount": 49.99,
        "currency": "USD",
        "status": "SUCCESS"
      }
      """
    Then the response status code should be 200
    And the database table "webhook_logs" should contain:
      | Transaction ID | Event Name        | Status  |
      | TXN_987654     | payment_completed | SUCCESS |
`
  },
  {
    id: 'syntax_error',
    name: '❌ Syntax & Lexing Errors',
    description: 'Triggers syntax errors in @cucumber/gherkin and sistar/gherkin-validator.',
    code: `Feature: User Authentication System

  Scenario: Login with invalid password
    Given the user is on the login page
    When the user enters invalid credentials
    Then an error message should be displayed

  Scenario Outline: Login with multiple user credentials
    Given the user enters username "<user>" and password "<pass>"
    When clicking login
    Then the system responds with status "<status>"

  # Missing Examples: keyword below for Scenario Outline above!
  | user  | pass  | status |
  | admin | 1234  | fail   |

  Scenario: Unclosed table structure
    Given the following items exist
      | Item Name | Price
      | Laptop    | 1000 |
`
  },
  {
    id: 'linter_issue',
    name: '⚠️ Linter Rule Violations',
    description: 'Triggers gherkin-lint rules: duplicate scenario titles, bad indentation, repeated keywords.',
    code: `Feature: User Profile Settings

Scenario: Update profile email address
Given the user is logged into profile settings
Given the user clicks on the email input field
When the user types "new@example.com"
When the user clicks save
Then the profile should show "new@example.com"

Scenario: Update profile email address
    Given the user is on settings page
    Then email is updated
`
  },
  {
    id: 'inconsistent_step',
    name: '🔍 Inconsistent Steps & Missing Parameters',
    description: 'Triggers Matriz88/gherkin-checker: dangling steps, unclosed quotes, undefined parameters.',
    code: `Feature: Payment Processing Engine

  @payment
  Scenario: Processing credit card payment
    And the user has entered credit card number "4111222233334444
    Then the payment is processed successfully

  Scenario Outline: Checkout with multiple currency types
    Given the item price is "<amount>"
    When paying in currency "<currency>"
    Then conversion rate "<rate>" is applied

    Examples:
      | amount | currency |
      | 100    | USD      |
`
  }
];
