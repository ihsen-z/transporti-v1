const { execSync } = require('child_process');
const fs = require('fs');

const validBranchPrefixes = ['feature/', 'fix/', 'hotfix/', 'release/'];
const validExceptions = ['main', 'develop', 'master'];

const getCurrentBranch = () => {
    try {
        return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    } catch (error) {
        console.warn('Warning: Could not determine current branch. Skipping branch validation.');
        return null;
    }
};

const validateBranchName = () => {
    const branchName = getCurrentBranch();

    if (!branchName) {
        process.exit(0);
    }

    if (validExceptions.includes(branchName)) {
        console.log(`✅ Branch validation passed: '${branchName}' is a reserved branch.`);
        process.exit(0);
    }

    const isValidPrefix = validBranchPrefixes.some((prefix) => branchName.startsWith(prefix));

    if (!isValidPrefix) {
        console.error(
            `❌ Branch validation failed: '${branchName}' does not match the naming convention.\n` +
            `   Expected verify branch starts with one of: ${validBranchPrefixes.join(', ')}\n` +
            `   Or is one of: ${validExceptions.join(', ')}`
        );
        process.exit(1);
    }

    console.log(`✅ Branch validation passed: '${branchName}' follows the convention.`);
    process.exit(0);
};

validateBranchName();
