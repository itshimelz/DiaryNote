export interface CursorCoordinates {
  top: number;
  left: number;
  lineHeight: number;
}

/**
 * Computes exact { top, left, lineHeight } pixel coordinates of text cursor inside a <textarea>
 * using an exact DOM mirror calculation.
 */
export function getTextareaCursorCoordinates(
  textarea: HTMLTextAreaElement,
  cursorIndex: number
): CursorCoordinates {
  if (!textarea) return { top: 32, left: 10, lineHeight: 24 };

  const mirror = document.createElement('div');
  const style = window.getComputedStyle(textarea);

  const propertiesToCopy = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
  ];

  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  mirror.style.top = '0px';
  mirror.style.left = '-9999px';

  propertiesToCopy.forEach((prop) => {
    // @ts-ignore
    mirror.style[prop] = style[prop];
  });

  const textBeforeCursor = textarea.value.slice(0, cursorIndex);
  mirror.textContent = textBeforeCursor;

  const cursorSpan = document.createElement('span');
  cursorSpan.textContent = textarea.value.slice(cursorIndex) || '.';
  mirror.appendChild(cursorSpan);

  document.body.appendChild(mirror);

  const spanTop = cursorSpan.offsetTop;
  const spanLeft = cursorSpan.offsetLeft;

  document.body.removeChild(mirror);

  const lineHeight = parseInt(style.lineHeight, 10) || 24;

  return {
    top: spanTop,
    left: spanLeft,
    lineHeight,
  };
}
