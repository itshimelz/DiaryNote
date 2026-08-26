import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import type { Components } from 'react-markdown';

function disableIndentedCodePlugin(this: any) {
  const data = this.data();
  data.micromarkExtensions = (data.micromarkExtensions || []).concat({
    disable: { null: ['codeIndented'] },
  });
}

const REMARK_PLUGINS = [remarkGfm, remarkBreaks, disableIndentedCodePlugin];

export const MarkdownContent = ({ content, components }: { content: string; components: Components }) => {
  const plugins = useMemo(() => REMARK_PLUGINS, []);
  return (
    <ReactMarkdown remarkPlugins={plugins} components={components}>
      {content}
    </ReactMarkdown>
  );
};
