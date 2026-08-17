use pulldown_cmark::{Event, Parser, Tag, TagEnd};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MarkdownLink {
    pub text: String,
    pub target: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct ParsedLinks {
    pub mentions: Vec<String>,
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

    // 1. Extract @[Target] mentions via fast manual scanning
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
                        let mention = slice.trim().to_string();
                        if !mention.is_empty() && !links.mentions.contains(&mention) {
                            links.mentions.push(mention);
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
                        let wikilink = slice.trim().to_string();
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
Refer to @[Architecture Plan] and [[Database Schema]].
Check out the #rust and #backend tags.
Also see the [GitHub Repository](https://github.com/itshimelz/DiaryNote).
        "#;

        let parsed = parse_markdown_links(text);
        assert_eq!(parsed.mentions, vec!["Architecture Plan"]);
        assert_eq!(parsed.wikilinks, vec!["Database Schema"]);
        assert!(parsed.tags.contains(&"rust".to_string()));
        assert!(parsed.tags.contains(&"backend".to_string()));

        assert_eq!(parsed.markdown_links.len(), 1);
        assert_eq!(parsed.markdown_links[0].text, "GitHub Repository");
        assert_eq!(
            parsed.markdown_links[0].target,
            "https://github.com/itshimelz/DiaryNote"
        );
    }
}
