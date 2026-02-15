# ðŸ” SonarQube Integration Guide

**Version**: 3.2.0  
**Phase**: Phase 5 Section 5.3 - Static Analysis  
**Platform**: SonarQube Cloud

---

## ðŸŽ¯ Overview

This guide explains how to integrate SonarQube static analysis into the GeoLeaf JS project for continuous code quality monitoring.

### Benefits

| Feature | Benefit |
|---------|---------|
| **Code Quality** | Automated detection of bugs, code smells, vulnerabilities |
| **Security** | SAST (Static Application Security Testing) |
| **Coverage** | Track test coverage trends |
| **Technical Debt** | Measure and track code maintainability |
| **Quality Gates** | Enforce quality standards in CI/CD |

---

## ðŸ“‹ Prerequisites

1. **SonarQube Cloud Account**
   - Sign up at [sonarcloud.io](https://sonarcloud.io)
   - Create organization for your project

2. **GitHub Integration**
   - Install SonarCloud GitHub App
   - Grant access to repository

3. **Local Tools**
   - Node.js 18+ installed
   - npm or yarn installed

---

## ðŸš€ Setup Instructions

### Step 1: Create SonarQube Project

1. Go to [sonarcloud.io](https://sonarcloud.io)
2. Click **"Analyze new project"**
3. Select **GeoLeaf JS** repository
4. Set project key: `geoleaf-js`
5. Copy the generated **SONAR_TOKEN**

### Step 2: Configure GitHub Secrets

Add these secrets to your GitHub repository:

```
Settings â†’ Secrets and variables â†’ Actions â†’ New repository secret
```

**Required Secrets:**
- `SONAR_TOKEN`: Your SonarQube token
- `SONAR_HOST_URL`: `https://sonarcloud.io`
- `SONAR_ORGANIZATION`: Your organization key

### Step 3: Update GitHub Actions Workflow

Add SonarQube step to `.github/workflows/ci.yml`:

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop, refactoring/**]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for SonarQube
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests with coverage
        run: npm run test:coverage
      
      - name: SonarQube Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        with:
          args: >
            -Dsonar.projectKey=geoleaf-js
            -Dsonar.organization=geoleaf-team
            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
      
      - name: Quality Gate Check
        uses: sonarsource/sonarqube-quality-gate-action@master
        timeout-minutes: 5
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### Step 4: Verify sonar-project.properties

The `sonar-project.properties` file should already be in the root directory. Verify it contains:

```properties
sonar.projectKey=geoleaf-js
sonar.projectName=GeoLeaf JS
sonar.projectVersion=3.2.0
sonar.organization=geoleaf-team

sonar.sources=src/static/js
sonar.tests=__tests__

sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.qualitygate.wait=true
```

---

## ðŸŽ¯ Quality Gates

### Default Quality Gate

SonarQube enforces these quality standards:

| Metric | Threshold | Status |
|--------|-----------|--------|
| **Coverage** | â‰¥ 75% | âœ… Pass |
| **Duplications** | â‰¤ 3% | âœ… Pass |
| **Maintainability** | A rating | âœ… Pass |
| **Reliability** | A rating | âœ… Pass |
| **Security** | A rating | âœ… Pass |
| **New Code Coverage** | â‰¥ 80% | âœ… Pass |
| **New Duplications** | â‰¤ 3% | âœ… Pass |

### Custom Quality Gate (Recommended)

Create custom quality gate for GeoLeaf JS:

```
Quality Gates â†’ Create â†’ "GeoLeaf Quality Gate"
```

**Conditions:**

1. **On New Code:**
   - Coverage â‰¥ 80%
   - Duplicated Lines â‰¤ 3%
   - Maintainability Rating = A
   - Reliability Rating = A
   - Security Rating = A
   - Security Hotspots Reviewed = 100%

2. **On Overall Code:**
   - Coverage â‰¥ 75%
   - Duplicated Lines â‰¤ 5%
   - Maintainability Rating â‰¥ B
   - Reliability Rating â‰¥ A
   - Security Rating â‰¥ A

3. **Blocker Issues:**
   - Blocker Issues = 0
   - Critical Issues â‰¤ 5

---

## ðŸ“Š Metrics Explained

### Code Smells

**What**: Maintainability issues that don't break functionality

**Examples:**
- Complex functions (cognitive complexity > 15)
- Duplicate code blocks
- Magic numbers without constants
- TODO/FIXME comments

**GeoLeaf Target**: < 50 code smells total

### Bugs

**What**: Code that is likely to produce unexpected behavior

**Examples:**
- Null pointer dereference
- Off-by-one errors
- Unused variables
- Incorrect logic

**GeoLeaf Target**: 0 bugs (Reliability Rating A)

### Vulnerabilities

**What**: Security weaknesses that could be exploited

**Examples:**
- XSS vulnerabilities
- SQL injection risks
- Insecure cryptography
- Hardcoded credentials

**GeoLeaf Target**: 0 vulnerabilities (Security Rating A)

### Security Hotspots

**What**: Security-sensitive code requiring manual review

**Examples:**
- HTTP requests
- File system access
- Command execution
- Authentication logic

**GeoLeaf Target**: 100% reviewed

### Technical Debt

**What**: Time to fix all code smells

**Calculation:**
```
Technical Debt = Sum of remediation effort for all code smells
```

**GeoLeaf Target**: < 2 days (16 hours)

---

## ðŸ”§ Local Analysis

### Run SonarQube Scanner Locally

Install scanner:

```bash
npm install -g sonarqube-scanner
```

Run analysis:

```bash
# With coverage
npm run test:coverage
sonar-scanner

# Results will be sent to SonarCloud
```

### Docker Analysis (Alternative)

```bash
docker run --rm \
  -e SONAR_HOST_URL="https://sonarcloud.io" \
  -e SONAR_TOKEN="your-token-here" \
  -v "$(pwd):/usr/src" \
  sonarsource/sonar-scanner-cli
```

---

## ðŸ“ˆ Dashboard & Reports

### View Analysis Results

1. Go to [sonarcloud.io](https://sonarcloud.io)
2. Select **GeoLeaf JS** project
3. Navigate to:
   - **Overview**: High-level metrics
   - **Issues**: List of all issues
   - **Measures**: Detailed metrics
   - **Code**: Annotated source code
   - **Activity**: Historical trends

### Key Pages

**Overview Tab:**
- Quality Gate status
- Coverage percentage
- Code smells count
- Security issues

**Issues Tab:**
- Filter by: Type, Severity, Status
- Assign to developers
- Mark as False Positive
- Track remediation

**Measures Tab:**
- Coverage trends
- Complexity metrics
- Duplication percentage
- Technical debt

---

## ðŸš¨ Handling Issues

### Issue Severity Levels

| Severity | Description | Action Required |
|----------|-------------|-----------------|
| **Blocker** | Bug that breaks functionality | Fix immediately |
| **Critical** | Security vulnerability or major bug | Fix within 1 day |
| **Major** | Quality issue affecting maintainability | Fix within 1 week |
| **Minor** | Small issue, low impact | Fix when convenient |
| **Info** | Suggestion, no action required | Optional |

### Issue Workflow

1. **Triage**
   - Review new issues daily
   - Assign to appropriate developer
   - Set target resolution date

2. **Fix**
   - Create branch: `fix/sonar-issue-{ID}`
   - Implement fix
   - Add test if applicable
   - Commit with: `fix: resolve SonarQube issue {ID}`

3. **Verify**
   - Re-run SonarQube analysis
   - Confirm issue resolved
   - Mark as fixed in SonarQube

4. **False Positives**
   - If issue is false positive:
   - Mark as "Won't fix" in SonarQube
   - Add comment explaining why
   - Consider adding to exclusions in sonar-project.properties

---

## ðŸ” Security Analysis (SAST)

### Security Rules Enabled

SonarQube scans for OWASP Top 10 vulnerabilities:

1. **Injection** (SQL, XSS, Command)
2. **Broken Authentication**
3. **Sensitive Data Exposure**
4. **XML External Entities (XXE)**
5. **Broken Access Control**
6. **Security Misconfiguration**
7. **Cross-Site Scripting (XSS)**
8. **Insecure Deserialization**
9. **Components with Known Vulnerabilities**
10. **Insufficient Logging**

### GeoLeaf Security Checks

Already implemented in Phase 2:
- âœ… XSS prevention (escapeHtml, setSafeHTML)
- âœ… CSRF tokens
- âœ… Input validation
- âœ… File upload validation
- âœ… Secure headers (CSP, CORS)

SonarQube will verify these are applied consistently.

---

## ðŸ“Š Coverage Integration

### Generate Coverage Report

```bash
# Jest with coverage
npm run test:coverage

# Output: coverage/lcov.info
```

### Coverage Thresholds

Configured in `package.json`:

```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 75,
        "functions": 75,
        "lines": 75,
        "statements": 75
      }
    }
  }
}
```

SonarQube will import coverage data and track trends.

---

## ðŸŽ“ Best Practices

### 1. Monitor Quality Gate Daily

- Check SonarCloud dashboard every morning
- Address new issues immediately
- Prevent technical debt accumulation

### 2. Fix Issues Before Merging

```yaml
# In GitHub Actions
- name: Quality Gate Check
  run: |
    if [ "$QUALITY_GATE" != "PASSED" ]; then
      echo "Quality gate failed!"
      exit 1
    fi
```

### 3. Review Security Hotspots

- Manually review all security-sensitive code
- Mark as "Safe" or "Fix" in SonarQube
- Document security decisions

### 4. Track Metrics Over Time

- Monitor coverage trends
- Track technical debt reduction
- Set sprint goals for code quality

### 5. Educate Team

- Share SonarQube reports in daily standups
- Discuss patterns in code smells
- Learn from security vulnerabilities

---

## ðŸ”— Integration with Other Tools

### ESLint Integration

SonarQube imports ESLint results:

```json
{
  "scripts": {
    "lint:report": "eslint src --format json --output-file eslint-report.json"
  }
}
```

Update `sonar-project.properties`:

```properties
sonar.eslint.reportPaths=eslint-report.json
```

### IDE Integration

**VS Code:**
- Install extension: `SonarLint`
- Connect to SonarCloud
- Get real-time issue detection

**IntelliJ IDEA:**
- Install plugin: `SonarLint`
- Bind to SonarCloud project

---

## ðŸ“‹ Checklist

**Initial Setup:**
- [ ] Create SonarQube Cloud account
- [ ] Create project in SonarCloud
- [ ] Add GitHub secrets (SONAR_TOKEN)
- [ ] Update GitHub Actions workflow
- [ ] Verify sonar-project.properties
- [ ] Run first analysis
- [ ] Configure quality gate

**Daily Workflow:**
- [ ] Check quality gate status
- [ ] Review new issues
- [ ] Fix blocker/critical issues
- [ ] Monitor coverage trends

**Weekly:**
- [ ] Review security hotspots
- [ ] Analyze code smells
- [ ] Track technical debt
- [ ] Plan refactoring sprints

---

## ðŸ†˜ Troubleshooting

### Issue: Quality Gate Fails

**Solution:**
1. Check which condition failed
2. View detailed metrics
3. Fix underlying issues
4. Re-run analysis

### Issue: Coverage Not Reported

**Solution:**
1. Verify `coverage/lcov.info` exists
2. Check `sonar.javascript.lcov.reportPaths` in properties
3. Ensure tests run before SonarQube scan

### Issue: False Positives

**Solution:**
1. Mark as "Won't fix" in SonarQube
2. Add exclusion to `sonar-project.properties`
3. Document decision

---

## ðŸ“š Resources

- [SonarQube Cloud Documentation](https://docs.sonarcloud.io/)
- [JavaScript Analysis Rules](https://rules.sonarsource.com/javascript)
- [Quality Gates](https://docs.sonarcloud.io/improving/quality-gates/)
- [SAST for JavaScript](https://www.sonarqube.org/features/security/)

---

**Maintained by**: GeoLeaf DevOps Team  
**Last Updated**: January 22, 2026  
**Phase**: Phase 5 Section 5.3
