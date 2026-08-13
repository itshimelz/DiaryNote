/**
 * Computes exact { top, left } pixel coordinates of text cursor inside a <textarea>
 * using a DOM mirror calculation, with automatic directional flipping (above/below cursor)
 * to ensure popup menus fit cleanly inside available space.
 */
export function getTextareaCursorCoordinates(
  textarea: HTMLTextAreaElement,
  cursorIndex: number,
  menuHeight: number = 240
): { top: number; left: number } {
  if (!textarea) return { top: 32, left: 10 };

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
  const containerHeight = textarea.clientHeight || textarea.offsetHeight || 300;

  // Measure available space above and below the current cursor line
  const spaceBelow = containerHeight - (spanTop + lineHeight);
  const spaceAbove = spanTop;

  let topPos: number;

  // If menu does not fit below and there is more room above, flip menu ABOVE cursor
  if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
    topPos = Math.max(4, spanTop - menuHeight - 4);
  } else {
    topPos = spanTop + lineHeight + 4;
  }

  const leftPos = Math.min(Math.max(spanLeft, 10), Math.max(textarea.clientWidth - 260, 10));

  return { top: topPos, left: leftPos };
}
