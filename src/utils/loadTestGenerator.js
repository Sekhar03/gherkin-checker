/**
 * Module 18: Performance & Load Test Scenario Generator Engine
 * Converts Gherkin feature scenarios into k6 (JS), Apache JMeter (.jmx XML), and Gatling (Scala).
 */

// Helper to sanitize XML strings for JMeter
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates k6 JavaScript Load Testing Script
 */
export function generateK6Script(gherkinCode, config) {
  const { vus = 50, duration = '30s', targetHost = 'https://api.example.com' } = config;
  const lines = (gherkinCode || '').split(/\r?\n/);
  
  const scenarios = [];
  let currentScenario = null;

  lines.forEach(l => {
    const trimmed = l.trim();
    if (/^Scenario/i.test(trimmed)) {
      currentScenario = { title: trimmed.replace(/^Scenario.*:/i, '').trim() || 'User Journey', steps: [] };
      scenarios.push(currentScenario);
    } else if (/^(Given|When|Then|And|But)\s+/i.test(trimmed) && currentScenario) {
      currentScenario.steps.push(trimmed);
    }
  });

  const scenarioCalls = scenarios.length > 0 ? scenarios.map((sc, idx) => `
  // Scenario ${idx + 1}: ${sc.title}
  group('${sc.title.replace(/'/g, "\\'")}', function () {
    let res = http.get('${targetHost}/api/v1/scenario-${idx + 1}');
    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });
    sleep(1);
  });`).join('\n') : `
  group('Default User Scenario', function () {
    let res = http.get('${targetHost}/api/v1/health');
    check(res, { 'status is 200': (r) => r.status === 200 });
    sleep(1);
  });`;

  return `import http from 'k6/http';
import { check, group, sleep } from 'k6';

// Configured Performance & Load Test Options
export const options = {
  stages: [
    { duration: '5s', target: ${Math.round(vus * 0.5)} }, // Ramp-up
    { duration: '${duration}', target: ${vus} },        // Peak Load
    { duration: '5s', target: 0 },                       // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
  },
};

export default function () {
${scenarioCalls}
}
`;
}

/**
 * Generates Apache JMeter Test Plan XML (.jmx)
 */
export function generateJMeterScript(gherkinCode, config) {
  const { vus = 50, duration = '30s', targetHost = 'https://api.example.com' } = config;
  const hostClean = targetHost.replace(/^https?:\/\//, '');

  return `<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.5">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="Gherkin Load Test Plan" enabled="true">
      <stringProp name="TestPlan.comments">Generated automatically by Gherkin Checker Suite</stringProp>
      <boolProp name="TestPlan.functional_mode">false</boolProp>
      <boolProp name="TestPlan.tearDown_on_shutdown">true</boolProp>
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
        <collectionProp name="Arguments.arguments"/>
      </elementProp>
    </TestPlan>
    <hashTree>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="Gherkin VU Thread Group" enabled="true">
        <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" testclass="LoopController" testname="Loop Controller" enabled="true">
          <boolProp name="LoopController.continueForever">false</boolProp>
          <intProp name="LoopController.loops">-1</intProp>
        </elementProp>
        <stringProp name="ThreadGroup.num_threads">${vus}</stringProp>
        <stringProp name="ThreadGroup.ramp_time">10</stringProp>
        <boolProp name="ThreadGroup.scheduler">true</boolProp>
        <stringProp name="ThreadGroup.duration">30</stringProp>
        <stringProp name="ThreadGroup.delay">0</stringProp>
      </ThreadGroup>
      <hashTree>
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="HTTP Request - ${escapeXml(hostClean)}" enabled="true">
          <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="HTTPArgumentsPanel" testclass="Arguments" enabled="true">
            <collectionProp name="Arguments.arguments"/>
          </elementProp>
          <stringProp name="HTTPSampler.domain">${escapeXml(hostClean)}</stringProp>
          <stringProp name="HTTPSampler.port"></stringProp>
          <stringProp name="HTTPSampler.protocol">https</stringProp>
          <stringProp name="HTTPSampler.path">/</stringProp>
          <stringProp name="HTTPSampler.method">GET</stringProp>
          <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
          <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
        </HTTPSamplerProxy>
        <hashTree/>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>`;
}

/**
 * Generates Gatling Simulation Script (Scala)
 */
export function generateGatlingScript(gherkinCode, config) {
  const { vus = 50, duration = '30s', targetHost = 'https://api.example.com' } = config;

  return `package computerdatabase

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class GherkinGatlingSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("${targetHost}")
    .acceptHeader("application/json")
    .userAgentHeader("Gherkin-Gatling-LoadTester/1.0")

  val scn = scenario("Gherkin Feature Load Scenario")
    .exec(
      http("Execute User Journey")
        .get("/")
        .check(status.is(200))
    )
    .pause(1)

  setUp(
    scn.inject(
      rampUsers(${vus}).during(10.seconds),
      constantUsersPerSec(${vus}).during(30.seconds)
    ).protocols(httpProtocol)
  )
}
`;
}
