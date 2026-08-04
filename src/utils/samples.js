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
