use pulldown_cmark::{Event, Parser, Tag, TagEnd};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct MarkdownLink {
    pub text: String,
    pub target: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct MentionLink {
    pub title: String,
    pub target_id: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct ParsedLinks {
    pub mentions: Vec<String>,
    pub mention_links: Vec<MentionLink>,
    pub wikilinks: Vec<String>,
    pub tags: Vec<String>,
    pub markdown_links: Vec<MarkdownLink>,
}

/// Parses Markdown text to extract @mentions, [[wikilinks]], #tags, and standard markdown links.
pub fn parse_markdown_links(content: &str) -> ParsedLinks {
    let mut links = ParsedLinks::default();
    if content.is_empty() {
        return links;
    }

    // 1. Extract @[Target](id) or @[Target] mentions and [[wikilinks]] via fast manual scanning
    let mut chars = content.char_indices().peekable();
    while let Some((i, c)) = chars.next() {
        if c == '@' {
            if let Some(&(_, '[')) = chars.peek() {
                chars.next(); // consume '['
                let start = i + 2;
                let mut end = None;
                for (j, inner_c) in chars.by_ref() {
                    if inner_c == ']' {
                        end = Some(j);
                        break;
                    }
                    if inner_c == '\n' {
                        break;
                    }
                }
                if let Some(e) = end {
                    if let Some(slice) = content.get(start..e) {
                        let title = slice.trim().to_string();
                        let mut target_id = None;

                        // Check if immediately followed by (id)
                        if let Some(&(_, '(')) = chars.peek() {
                            chars.next(); // consume '('
                            let id_start = e + 2;
                            let mut id_end = None;
                            for (j, inner_c) in chars.by_ref() {
                                if inner_c == ')' {
                                    id_end = Some(j);
                                    break;
                                }
                                if inner_c == '\n' || inner_c == ' ' {
                                    break;
                                }
                            }
                            if let Some(ie) = id_end {
                                if let Some(id_slice) = content.get(id_start..ie) {
                                    let id_val = id_slice.trim().to_string();
                                    if !id_val.is_empty() {
                                        target_id = Some(id_val);
                                    }
                                }
                            }
                        }

                        if !title.is_empty() {
                            if !links.mentions.contains(&title) {
                                links.mentions.push(title.clone());
                            }
                            let mention_entry = MentionLink {
                                title,
                                target_id,
                            };
                            if !links.mention_links.iter().any(|m| m == &mention_entry) {
                                links.mention_links.push(mention_entry);
                            }
                        }
                    }
                }
            }
        } else if c == '[' {
            // Check for [[wikilink]]
            if let Some(&(_, '[')) = chars.peek() {
                chars.next(); // consume second '['
                let start = i + 2;
                let mut end = None;
                let mut prev_c = ' ';
                for (j, inner_c) in chars.by_ref() {
                    if inner_c == ']' && prev_c == ']' {
                        end = Some(j - 1);
                        break;
                    }
                    if inner_c == '\n' {
                        break;
                    }
                    prev_c = inner_c;
                }
                if let Some(e) = end {
                    if let Some(slice) = content.get(start..e) {
                        let raw = slice.trim();
                        // Support [[Target|Alias]]
                        let target = if let Some((tgt, _)) = raw.split_once('|') {
                            tgt.trim()
                        } else {
                            raw
                        };
                        let wikilink = target.to_string();
                        if !wikilink.is_empty() && !links.wikilinks.contains(&wikilink) {
                            links.wikilinks.push(wikilink);
                        }
                    }
                }
            }
        } else if c == '#' {
            // Check for #tag
            let start = i + 1;
            let mut end = start;
            for (j, inner_c) in chars.by_ref() {
                if inner_c.is_alphanumeric() || inner_c == '_' || inner_c == '-' {
                    end = j + inner_c.len_utf8();
                } else {
                    break;
                }
            }
            if end > start {
                if let Some(slice) = content.get(start..end) {
                    let tag = slice.to_lowercase();
                    if !tag.is_empty() && !links.tags.contains(&tag) {
                        links.tags.push(tag);
                    }
                }
            }
        }
    }

    // 2. Extract standard markdown links via pulldown-cmark AST
    let parser = Parser::new(content);
    let mut current_link_target: Option<String> = None;
    let mut current_link_text = String::new();

    for event in parser {
        match event {
            Event::Start(Tag::Link { dest_url, .. }) => {
                current_link_target = Some(dest_url.to_string());
                current_link_text.clear();
            }
            Event::Text(t) => {
                if current_link_target.is_some() {
                    current_link_text.push_str(&t);
                }
            }
            Event::End(TagEnd::Link) => {
                if let Some(target) = current_link_target.take() {
                    links.markdown_links.push(MarkdownLink {
                        text: current_link_text.clone(),
                        target,
                    });
                    current_link_text.clear();
                }
            }
            _ => {}
        }
    }

    links
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_markdown_links_and_mentions() {
        let text = r#"
# Project Roadmap
Refer to @[Architecture Plan](note-arch-123) and @[Database Design] and [[Database Schema|Schema Section]].
Check out the #rust and #backend tags.
Also see the [GitHub Repository](https://github.com/itshimelz/DiaryNote) and [Target Note](#note-target-456).
        "#;

        let parsed = parse_markdown_links(text);
        assert_eq!(parsed.mentions, vec!["Architecture Plan", "Database Design"]);
        assert_eq!(parsed.mention_links.len(), 2);
        assert_eq!(parsed.mention_links[0].title, "Architecture Plan");
        assert_eq!(parsed.mention_links[0].target_id, Some("note-arch-123".to_string()));
        assert_eq!(parsed.mention_links[1].title, "Database Design");
        assert_eq!(parsed.mention_links[1].target_id, None);

        assert_eq!(parsed.wikilinks, vec!["Database Schema"]);
        assert!(parsed.tags.contains(&"rust".to_string()));
        assert!(parsed.tags.contains(&"backend".to_string()));

        assert_eq!(parsed.markdown_links.len(), 3);
        assert_eq!(parsed.markdown_links[0].text, "Architecture Plan");
        assert_eq!(parsed.markdown_links[0].target, "note-arch-123");
        assert_eq!(parsed.markdown_links[1].text, "GitHub Repository");
        assert_eq!(
            parsed.markdown_links[1].target,
            "https://github.com/itshimelz/DiaryNote"
        );
        assert_eq!(parsed.markdown_links[2].text, "Target Note");
        assert_eq!(parsed.markdown_links[2].target, "#note-target-456");
    }
}

