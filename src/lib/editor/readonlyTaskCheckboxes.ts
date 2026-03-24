const TASK_CHECKBOX_INPUT_REGEX = /<input\b[^>]*\btype=(["'])checkbox\1[^>]*>/gi
const CHECKED_ATTRIBUTE_REGEX = /\schecked(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/i
const DISABLED_ATTRIBUTE_REGEX = /\sdisabled(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/i
const ARIA_DISABLED_ATTRIBUTE_REGEX = /\saria-disabled(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/i
const ARIA_LABEL_ATTRIBUTE_REGEX = /\saria-label(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/i

const shouldKeepCheckedAttribute = (rawValue?: string): boolean => {
  if (rawValue === undefined) {
    // Bare `checked` means true in HTML.
    return true
  }

  const normalized = rawValue.trim().toLowerCase()

  return normalized === 'true' || normalized === 'checked'
}

export const makeTaskCheckboxesReadonly = (html: string): string => {
  return html.replace(TASK_CHECKBOX_INPUT_REGEX, (inputTag) => {
    let nextTag = inputTag

    const checkedMatch = nextTag.match(CHECKED_ATTRIBUTE_REGEX)

    if (checkedMatch) {
      const rawValue = checkedMatch[1] ?? checkedMatch[2] ?? checkedMatch[3]

      if (!shouldKeepCheckedAttribute(rawValue)) {
        nextTag = nextTag.replace(CHECKED_ATTRIBUTE_REGEX, '')
      }
    }

    if (DISABLED_ATTRIBUTE_REGEX.test(nextTag)) {
      nextTag = nextTag.replace(DISABLED_ATTRIBUTE_REGEX, '')
    }

    if (!ARIA_DISABLED_ATTRIBUTE_REGEX.test(nextTag)) {
      nextTag = nextTag.replace(/\/?>$/, (ending) => ` aria-disabled="true"${ending}`)
    }

    if (!ARIA_LABEL_ATTRIBUTE_REGEX.test(nextTag)) {
      nextTag = nextTag.replace(/\/?>$/, (ending) => ` aria-label="Read-only task checkbox"${ending}`)
    }

    return nextTag
  })
}
