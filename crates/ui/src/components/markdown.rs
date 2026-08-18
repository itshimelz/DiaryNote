//! Rich Markdown and Checklist Rendering Engine (`markdown.rs`).
//!
//! Uses `pulldown-cmark` to parse CommonMark AST into GPUI elements
//! supporting Headings, Checklists (`[ ]` / `[x]`), Code blocks,
//! Blockquotes, Lists, and inline styling without emojis.

use crate::primitives::checkbox::Checkbox;
use crate::tokens::{
    colors::Rgba as TokenRgba,
    colors::SLATE_200,
    radius::CORNER_RADIUS_XS,
    surfaces::SurfaceTheme,
};
use gpui::prelude::*;
use gpui::*;
use pulldown_cmark::{Event, Parser, Tag, TagEnd};
use serde::{Deserialize, Serialize};

/// Markdown Block Element Node
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum MarkdownBlock {
    Heading {
        level: u32,
        text: String,
    },
    Paragraph(String),
    ChecklistItem {
        completed: bool,
        text: String,
        index: usize,
    },
    BulletItem(String),
    NumberedItem {
        number: u64,
        text: String,
    },
    CodeBlock {
        language: Option<String>,
        code: String,
    },
    Blockquote(String),
    ThematicBreak,
}

/// Parse raw markdown text into a sequence of MarkdownBlocks
pub fn parse_markdown(input: &str) -> Vec<MarkdownBlock> {
    let mut blocks = Vec::new();
    let parser = Parser::new(input);

    let mut in_blockquote = false;
    let mut current_text = String::new();
    let mut code_lang = None;
    let mut list_index = 0usize;

    for event in parser {
        match event {
            Event::Start(tag) => {
                match &tag {
                    Tag::CodeBlock(pulldown_cmark::CodeBlockKind::Fenced(lang)) => {
                        code_lang = Some(lang.to_string());
                        current_text.clear();
                    }
                    Tag::CodeBlock(pulldown_cmark::CodeBlockKind::Indented) => {
                        code_lang = None;
                        current_text.clear();
                    }
                    Tag::BlockQuote(_) => {
                        in_blockquote = true;
                        current_text.clear();
                    }
                    Tag::Heading { .. } | Tag::Paragraph | Tag::Item => {
                        current_text.clear();
                    }
                    _ => {}
                }
            }
            Event::Text(text) => {
                current_text.push_str(&text);
            }
            Event::Code(code) => {
                current_text.push('`');
                current_text.push_str(&code);
                current_text.push('`');
            }
            Event::SoftBreak | Event::HardBreak => {
                current_text.push('\n');
            }
            Event::Rule => {
                blocks.push(MarkdownBlock::ThematicBreak);
            }
            Event::TaskListMarker(checked) => {
                current_text.insert_str(0, if checked { "[x] " } else { "[ ] " });
            }
            Event::End(tag_end) => {
                let trimmed = current_text.trim().to_string();
                match tag_end {
                    TagEnd::Heading(level) => {
                        blocks.push(MarkdownBlock::Heading {
                            level: level as u32,
                            text: trimmed,
                        });
                        current_text.clear();
                    }
                    TagEnd::Paragraph => {
                        if !in_blockquote && !trimmed.is_empty() {
                            if trimmed.starts_with("[ ] ") || trimmed.starts_with("- [ ] ") {
                                let text = trimmed
                                    .trim_start_matches("- ")
                                    .trim_start_matches("[ ] ")
                                    .to_string();
                                blocks.push(MarkdownBlock::ChecklistItem {
                                    completed: false,
                                    text,
                                    index: list_index,
                                });
                                list_index += 1;
                            } else if trimmed.starts_with("[x] ") || trimmed.starts_with("- [x] ") {
                                let text = trimmed
                                    .trim_start_matches("- ")
                                    .trim_start_matches("[x] ")
                                    .to_string();
                                blocks.push(MarkdownBlock::ChecklistItem {
                                    completed: true,
                                    text,
                                    index: list_index,
                                });
                                list_index += 1;
                            } else {
                                blocks.push(MarkdownBlock::Paragraph(trimmed));
                            }
                            current_text.clear();
                        }
                    }
                    TagEnd::Item => {
                        if !trimmed.is_empty() {
                            if let Some(stripped) = trimmed.strip_prefix("[ ] ") {
                                blocks.push(MarkdownBlock::ChecklistItem {
                                    completed: false,
                                    text: stripped.to_string(),
                                    index: list_index,
                                });
                                list_index += 1;
                            } else if let Some(stripped) = trimmed.strip_prefix("[x] ") {
                                blocks.push(MarkdownBlock::ChecklistItem {
                                    completed: true,
                                    text: stripped.to_string(),
                                    index: list_index,
                                });
                                list_index += 1;
                            } else {
                                blocks.push(MarkdownBlock::BulletItem(trimmed));
                            }
                            current_text.clear();
                        }
                    }
                    TagEnd::CodeBlock => {
                        blocks.push(MarkdownBlock::CodeBlock {
                            language: code_lang.take(),
                            code: current_text.clone(),
                        });
                        current_text.clear();
                    }
                    TagEnd::BlockQuote(_) => {
                        in_blockquote = false;
                        if !trimmed.is_empty() {
                            blocks.push(MarkdownBlock::Blockquote(trimmed));
                        }
                        current_text.clear();
                    }
                    _ => {}
                }
            }
            _ => {}
        }
    }

    // Fallback: If no structured blocks were emitted but input is not empty, emit line by line
    if blocks.is_empty() && !input.trim().is_empty() {
        for line in input.lines() {
            let line_trimmed = line.trim();
            if let Some(stripped) = line_trimmed.strip_prefix("- [ ] ") {
                blocks.push(MarkdownBlock::ChecklistItem {
                    completed: false,
                    text: stripped.to_string(),
                    index: list_index,
                });
                list_index += 1;
            } else if let Some(stripped) = line_trimmed.strip_prefix("- [x] ") {
                blocks.push(MarkdownBlock::ChecklistItem {
                    completed: true,
                    text: stripped.to_string(),
                    index: list_index,
                });
                list_index += 1;
            } else if !line_trimmed.is_empty() {
                blocks.push(MarkdownBlock::Paragraph(line_trimmed.to_string()));
            }
        }
    }

    blocks
}

/// Declarative Markdown Document View
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MarkdownView {
    pub content: String,
    pub text_color: Option<TokenRgba>,
}

impl MarkdownView {
    pub fn new(content: impl Into<String>) -> Self {
        Self {
            content: content.into(),
            text_color: None,
        }
    }

    pub fn with_text_color(mut self, color: TokenRgba) -> Self {
        self.text_color = Some(color);
        self
    }
}

impl IntoElement for MarkdownView {
    type Element = Div;

    fn into_element(self) -> Self::Element {
        let theme = SurfaceTheme::dark();
        let base_text_color = self.text_color.unwrap_or(theme.text);
        let blocks = parse_markdown(&self.content);

        let mut container = div().flex().flex_col().gap_2().w_full();

        for block in blocks {
            match block {
                MarkdownBlock::Heading { level, text } => {
                    let mut heading = div().font_weight(FontWeight::BOLD);
                    match level {
                        1 => {
                            heading = heading
                                .text_lg()
                                .text_color(Hsla::from(base_text_color))
                                .child(text);
                        }
                        2 => {
                            heading = heading
                                .text_base()
                                .text_color(Hsla::from(base_text_color))
                                .child(text);
                        }
                        _ => {
                            heading = heading
                                .text_sm()
                                .text_color(Hsla::from(base_text_color))
                                .child(text);
                        }
                    }
                    container = container.child(heading);
                }
                MarkdownBlock::Paragraph(text) => {
                    let p = div()
                        .text_xs()
                        .line_height(px(18.0))
                        .text_color(Hsla::from(base_text_color))
                        .child(text);
                    container = container.child(p);
                }
                MarkdownBlock::ChecklistItem { completed, text, .. } => {
                    let checkbox = Checkbox::new("").with_checked(completed);
                    let mut label = div().text_xs().child(text);
                    if completed {
                        label = label
                            .line_through()
                            .text_color(Hsla::from(theme.text_dim));
                    } else {
                        label = label.text_color(Hsla::from(base_text_color));
                    }

                    let row = div()
                        .flex()
                        .items_center()
                        .gap_2()
                        .py(px(2.0))
                        .child(checkbox)
                        .child(label);
                    container = container.child(row);
                }
                MarkdownBlock::BulletItem(text) => {
                    let row = div()
                        .flex()
                        .items_start()
                        .gap_2()
                        .text_xs()
                        .child(
                            div()
                                .text_color(Hsla::from(theme.text_dim))
                                .child("•"),
                        )
                        .child(div().text_color(Hsla::from(base_text_color)).child(text));
                    container = container.child(row);
                }
                MarkdownBlock::NumberedItem { number, text } => {
                    let row = div()
                        .flex()
                        .items_start()
                        .gap_2()
                        .text_xs()
                        .child(
                            div()
                                .text_color(Hsla::from(theme.text_dim))
                                .child(format!("{}.", number)),
                        )
                        .child(div().text_color(Hsla::from(base_text_color)).child(text));
                    container = container.child(row);
                }
                MarkdownBlock::CodeBlock { language: _, code } => {
                    let code_el = div()
                        .p(px(8.0))
                        .rounded(px(CORNER_RADIUS_XS))
                        .bg(Hsla::from(theme.sub_surface))
                        .border_1()
                        .border_color(Hsla::from(theme.border_subtle))
                        .text_xs()
                        .font_family(".SystemUIFont")
                        .text_color(Hsla::from(SLATE_200))
                        .child(code);
                    container = container.child(code_el);
                }
                MarkdownBlock::Blockquote(text) => {
                    let quote_el = div()
                        .pl(px(8.0))
                        .border_l_2()
                        .border_color(Hsla::from(theme.border_hover))
                        .text_xs()
                        .text_color(Hsla::from(theme.text_muted))
                        .italic()
                        .child(text);
                    container = container.child(quote_el);
                }
                MarkdownBlock::ThematicBreak => {
                    let hr = div()
                        .w_full()
                        .h(px(1.0))
                        .my(px(4.0))
                        .bg(Hsla::from(theme.border));
                    container = container.child(hr);
                }
            }
        }

        container
    }
}

#[cfg(test)]
mod tests {
    use super::{parse_markdown, MarkdownBlock};

    #[test]
    fn test_parse_markdown_headings_and_paragraphs() {
        let md = "# Title\n\nThis is paragraph text.\n\n## Subtitle\nAnother line.";
        let blocks = parse_markdown(md);
        assert!(!blocks.is_empty());
        assert!(matches!(&blocks[0], MarkdownBlock::Heading { level: 1, text } if text == "Title"));
    }

    #[test]
    fn test_parse_markdown_checklists() {
        let md = "- [ ] First task\n- [x] Completed task";
        let blocks = parse_markdown(md);
        assert_eq!(blocks.len(), 2);
        assert!(matches!(&blocks[0], MarkdownBlock::ChecklistItem { completed: false, text, .. } if text == "First task"));
        assert!(matches!(&blocks[1], MarkdownBlock::ChecklistItem { completed: true, text, .. } if text == "Completed task"));
    }

    #[test]
    fn test_parse_markdown_code_and_quotes() {
        let md = "```rust\nfn main() {}\n```\n\n> A thoughtful note\n\n---";
        let blocks = parse_markdown(md);
        assert_eq!(blocks.len(), 3);
        assert!(matches!(&blocks[0], MarkdownBlock::CodeBlock { .. }));
        assert!(matches!(&blocks[1], MarkdownBlock::Blockquote(_)));
        assert!(matches!(&blocks[2], MarkdownBlock::ThematicBreak));
    }
}
