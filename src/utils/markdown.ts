import {
  LintState,
  LintRuleSummary,
  ChecksAnnotations,
  ActionData,
  OctokitUpdateChecksResponse,
} from '../types';
import dedent from 'dedent';

const CREDIT_TAG = `
  <sup>
    Report generated by <b><a href="https://github.com/bradennapier/eslint-plus-action">eslint-plus-action</a></b>
  </sup>
`;

const REPORT_FOOTER = ` 
  ---

  ${CREDIT_TAG}  
`;

/**
 * Gets the title string for a rule summary and links to the rule
 * documentation if available.
 */
function getRuleSummaryTitle(summary: LintRuleSummary): string {
  return `## [${summary.level}] ${
    summary.ruleUrl ? `[${summary.ruleId}](${summary.ruleUrl})` : summary.ruleId
  }`;
}

function getAnnotationFileLink(
  annotation: ChecksAnnotations,
  data: ActionData,
): string {
  return `[${annotation.path}](
    ${data.repoHtmlUrl}/blob/${data.sha}/${annotation.path}#L${annotation.start_line}-L${annotation.end_line}
  )`;
}

export function getAnnotationSuggestions({
  suggestions,
}: ChecksAnnotations): string {
  return suggestions && suggestions.length > 0
    ? suggestions
        .map((suggestion) => `\t\t* [SUGGESTION] ${suggestion.desc}`)
        .join('\n')
    : '';
}

function getAnnotationFileLine(annotation: ChecksAnnotations): string {
  return `Line ${annotation.start_line}${
    annotation.end_line !== annotation.start_line
      ? `-${annotation.end_line}`
      : ''
  }`;
}

function getLintAnnotation(
  annotation: ChecksAnnotations,
  data: ActionData,
): string {
  return dedent`- ${getAnnotationFileLink(
    annotation,
    data,
  )} ${getAnnotationFileLine(annotation)} - ${annotation.message}${
    data.issueSummaryType === 'full' ? getAnnotationSuggestions(annotation) : ''
  }`;
}

function getRuleSummary(summary: LintRuleSummary, data: ActionData): string {
  return dedent`
    ${getRuleSummaryTitle(summary)} 

    > ${summary.message}

    ${summary.annotations
      .map((annotation) => getLintAnnotation(annotation, data))
      .join('\n')}
  `;
}

export function getSortedRuleSummaries(
  state: LintState,
  data: ActionData,
): string {
  if (state.rulesSummaries.size === 0) {
    return '';
  }
  return dedent`
    ---
    
    ${[...state.rulesSummaries]
      .sort(([, a], [, b]) => a.level.localeCompare(b.level))
      .map(([, summary]) => getRuleSummary(summary, data))
      .join('\n\n---\n\n')}
  `;
}

export function getLintSummary(state: LintState): string {
  return dedent`
    |     Type     |       Occurrences       |            Fixable           |
    | ------------ | ----------------------- | ---------------------------- | 
    | **Errors**   | ${state.errorCount}     | ${state.fixableErrorCount}   |
    | **Warnings** | ${state.warningCount}   | ${state.fixableWarningCount} |
    | **Ignored**  | ${state.ignoredCount}   | N/A                          |
  `;
}

function getLintConclusions(
  checkResult: OctokitUpdateChecksResponse,
  checkUrl: string,
): string {
  return dedent`
    - **Result:**       ${checkResult.data.conclusion}
    - **Annotations:** [${checkResult.data.output.annotations_count} total](${checkUrl})
  `;
}

export function getIgnoredFilesSummary(
  state: LintState,
  data: ActionData,
  force = false,
): string {
  if (
    !force &&
    (!data.reportIgnoredFiles || data.issueSummaryType !== 'full')
  ) {
    return '';
  }
  return dedent`
    ---

    ## Ignored Files:

    ${state.ignoredFiles.map((filePath) => `- ${filePath}`).join('\n')}
  `;
}

export function getResultMarkdownBody(
  checkResult: OctokitUpdateChecksResponse,
  state: LintState,
  data: ActionData,
): string {
  const checkUrl = data.prHtmlUrl
    ? `${data.prHtmlUrl}/checks?check_run_id=${checkResult.data.id}`
    : checkResult.data.html_url;

  return dedent`
    ## ESLint Summary [View Full Report](${checkUrl})
  
    > Annotations are provided inline on the [Files Changed](${
      data.prHtmlUrl
    }/files) tab. You can also see all annotations that were generated on the [annotations page](${checkUrl}).
  
    ${getLintSummary(state)}
    ${getLintConclusions(checkResult, checkUrl)}
    ${getIgnoredFilesSummary(state, data)}
    ${getSortedRuleSummaries(state, data)}

    ${REPORT_FOOTER}
  `;
}