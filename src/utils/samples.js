export const SAMPLES = [
  {
    id: 'bad_atm_withdrawal',
    name: '❌ Anti-Pattern: ATM Cash Withdrawal (Imperative & Procedural)',
    description: 'Demonstrates procedural button clicks, technical details, ending punctuation, and first-person "I".',
    code: `Feature: ATM Withdrawal System

  Scenario: As an enabled user, I want to withdraw cash
    Given I authenticated with an enabled card.
    And The teller has enough money
    When I insert the card in the ATM
    And I enter my PIN on the keypad
    And I press the confirm PIN button
    And I press the withdrawal button
    And I enter the amount $100
    And I press confirm
    Then I get $100
    And The system prints a receipt
`
  },
  {
    id: 'good_atm_withdrawal',
    name: '✅ Refactored: ATM Cash Withdrawal (Declarative & Business-Focused)',
    description: 'Clean declarative refactor focusing on business outcomes and domain concepts.',
    code: `Feature: ATM Cash Withdrawal Engine

  @smoke @atm
  Scenario: Withdraw cash from ATM with sufficient balance
    Given the customer account balance is "$1000"
    And the ATM has "$1000" cash available
    When the customer requests to withdraw "$100"
    Then the ATM should dispense "$100"
    And the customer account balance should be "$900"
    And a transaction receipt is printed
`
  },
  {
    id: 'bad_google_search',
    name: '❌ Anti-Pattern: Search (Multiple Behaviors in 1 Scenario)',
    description: 'Violates One Behavior per Scenario rule with multiple When-Then sequences and UI details.',
    code: `Feature: Search Functionality

  Scenario: Search images of pandas
    Given the user opens a web browser
    And the user navigates to "https://www.google.com/"
    When the user enters "panda" into the search bar
    Then links related to "panda" are shown on the results page
    When the user clicks on the "Images" link at the top of the results page
    Then images related to "panda" are shown on the results page
`
  },
  {
    id: 'good_google_search',
    name: '✅ Refactored: Search (Split into 2 Single-Behavior Scenarios)',
    description: 'Refactored into two single-behavior scenarios, each with one Given-When-Then sequence.',
    code: `Feature: Search Functionality

  Scenario: Text search from search bar
    Given the search engine home page is displayed
    When the user searches for "panda"
    Then links related to "panda" should be displayed on the results page

  Scenario: Image search from search results page
    Given search results for "panda" are displayed
    When the user switches to the "Images" view
    Then images related to "panda" should be displayed
`
  },
  {
    id: 'feature_template',
    name: '📋 Official Feature Template (Background, Outlines & DataTables)',
    description: 'Standard Gherkin template following official Cucumber syntax rules and style conventions.',
    code: `Feature: User Authentication System
  In order to keep user accounts secure
  As a registered user
  I want to log in with my credentials

  Background:
    Given the login page is displayed

  @smoke @login
  Scenario: Successful login with valid credentials
    Given the user "alice@example.com" exists with status "active"
    When the user submits valid login credentials
    Then the user should be redirected to the dashboard
    And a welcome notification should be displayed

  @regression
  Scenario Outline: Unsuccessful login attempts with invalid inputs
    Given a registered user account
    When the user attempts to log in with username "<username>" and password "<password>"
    Then an error message "<error_message>" should be displayed

    Examples:
      | username          | password  | error_message            |
      | wronguser         | test123   | Invalid username         |
      | user@example.com  | wrongpass | Invalid password         |
`
  },
  {
    id: 'valid',
    name: '✅ E-Commerce Shopping Cart Spec (Passes All Checkers)',
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
  }
];
