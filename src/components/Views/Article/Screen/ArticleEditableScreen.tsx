'use client'

import { useCallback } from 'react'

import { DefaultEditor } from '~/components/Blocks/Editor/DefaultEditor'
import { useDefaultEditor } from '~/components/Blocks/Editor/hooks/useDefaultEditor'
import { MarkdownEditor } from '~/components/Blocks/Editor/MarkdownEditor'
import { Button, Typography } from '~/components/ui'
import { useNotify } from '~/providers/notify'
import { cn } from '~/utils/cn'
import { Logger } from '~/utils/logger'

type Props = {
  articleId?: string | null
  className?: string
  title?: string | null
}

const DEFAULT_CONTENT = `
  <h1>The Complete Guide to Modern Web Development</h1>
  <p>Web development has evolved significantly over the past decade. What once required multiple tools and complex setups can now be accomplished with </p>

  <img src="https://unsplash.it/500/500" alt="Random Image" />

  <h2>Getting Started</h2>
  <p>Before diving into the technical details, it's important to understand the foundational concepts that make modern web development possible.</p>

  <blockquote>
    <p>"The best code is no code at all. Every new line of c...." - Jeff Atwood</p>
  </blockquote>

  <p>This philosophy guides much of modern development practices, emphasizing simplicity and maintainability over complexity.</p>

  <table>
    <thead>
      <tr>
        <th>Feature</th>
        <th>Description</th>
        <th>Example</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Component-Based Architecture</td>
        <td>Breaks down the UI into reusable components.</td>
        <td><code>&lt;MyComponent /&gt;</code></td>
      </tr>
      <tr>
        <td>Virtual DOM</td>
        <td>Improves performance by minimizing direct DOM manipulation.</td>
        <td><code>&lt;VirtualDOMComponent /&gt;</code></td>
      </tr>
    </tbody>
  </table>

  <hr>

  <h2>Key Technologies</h2>
  <p>Here are the essential technologies every web developer should be familiar with:</p>

  <ul>
    <li>HTML5 and semantic markup</li>
    <li>CSS3 with modern layout techniques
      <ul>
        <li>Flexbox for one-dimensional layouts</li>
        <li>Grid for two-dimensional layouts</li>
        <li>Custom properties (CSS variables)</li>
      </ul>
    </li>
    <li>JavaScript (ES6+)</li>
    <li>TypeScript for type safety</li>
  </ul>

  <h3>Framework Comparison</h3>
  <p>Choosing the right framework depends on your project requirements:</p>

  <ol>
    <li>React - Component-based UI library</li>
    <li>Vue - Progressive framework</li>
    <li>Angular - Full-featured platform</li>
    <li>Svelte - Compile-time framework</li>
  </ol>

  <hr>

  <h2>Best Practices</h2>
  <p>Following established best practices ensures your code remains maintainable and scalable.</p>

  <blockquote>
    <p>Always write code as if the person who ends up maintaining it is a violent psychopath who knows where you live.</p>
  </blockquote>

  <h3>Code Organization</h3>
  <p>A well-organized codebase is crucial for long-term project success. Consider these principles:</p>

  <ul>
    <li>Separation of concerns</li>
    <li>DRY (Don't Repeat Yourself)</li>
    <li>KISS (Keep It Simple, Stupid)</li>
  </ul>

  <p>By following these guidelines, you'll create applications that are easier to maintain, test, and extend over time.</p>
`

const logger = new Logger(['ArticleEditableScreen', '[src/components/Views/Article/Screen/ArticleEditableScreen.tsx]'])

export const ArticleEditableScreen = (props: Props) => {
  const { notify } = useNotify()
  const { articleId: _articleId = null, className = '', title = 'Article Editor' } = props

  const { editor, mode, handleSetMarkdown, markdownInput, setMarkdownInput } = useDefaultEditor({ defaultContent: DEFAULT_CONTENT, limit: 10_000 })

  const handleSave = useCallback(() => {
    logger.info({
      json: editor?.getJSON(),
      html: editor?.getHTML(),
    })
  }, [editor])

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-4 relative">
        <Typography variant="heading-3">{title}</Typography>
        <div className="flex flex-row gap-3 flex-wrap">
          <Button variant={mode === 'default' ? 'default' : 'secondary'} size="sm-md" onClick={handleSetMarkdown('default')}>
            Text Editor
          </Button>
          <Button variant={mode === 'markdown' ? 'default' : 'secondary'} size="sm-md" onClick={handleSetMarkdown('markdown')}>
            Markdown Editor
          </Button>
        </div>
        <div
          className={cn({
            hidden: mode === 'markdown',
          })}
        >
          <DefaultEditor editor={editor} limit={10_000} />
        </div>
        {mode === 'markdown' && <MarkdownEditor value={markdownInput} editor={editor} onChange={setMarkdownInput} limit={10_000} />}
        <div className="">
          <Button variant="secondary" size="sm-md" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}
