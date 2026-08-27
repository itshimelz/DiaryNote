import React from 'react';
import { NoteCard } from './index';
import { ImageNoteCard } from './ImageNoteCard';
import { NoteCardLOD } from './NoteCardLOD';
import type { NoteCardProps } from './types';
import type { ImageNoteCardProps } from './ImageNoteCard';
import { useNote, useNotesList } from '../../stores/notesStore';
import { LOD_ZOOM_THRESHOLD } from '../../constants/canvas';

type TextCardProps = Omit<NoteCardProps, 'note' | 'allNotes'> & { noteId: string };
type ImageCardProps = Omit<ImageNoteCardProps, 'note' | 'allNotes'> & { noteId: string };

/**
 * Granular canvas cards: each subscribes to its own note in the external store,
 * so a keystroke in one card never re-renders siblings or the canvas shell.
 * The wrapped presentational components keep their exact existing prop surface
 * (note + allNotes) — zero behavioral rewrite inside ~1600 lines of card code.
 */
export const ConnectedNoteCard: React.FC<TextCardProps> = React.memo(({ noteId, ...rest }) => {
  const note = useNote(noteId);
  const allNotes = useNotesList();
  if (!note) return null;
  const zoom = rest.zoom ?? 1;
  const isSelected = Boolean(rest.isSelected);
  const isFocused = Boolean(rest.isFocused);
  const isDragging = Boolean(rest.isCardDragging);
  if (zoom < LOD_ZOOM_THRESHOLD && !isSelected && !isFocused && !isDragging) {
    return <NoteCardLOD note={note} allNotes={allNotes} {...rest} />;
  }
  return <NoteCard note={note} allNotes={allNotes} {...rest} />;
});

export const ConnectedImageNoteCard: React.FC<ImageCardProps> = React.memo(({ noteId, ...rest }) => {
  const note = useNote(noteId);
  const allNotes = useNotesList();
  if (!note) return null;
  const zoom = rest.zoom ?? 1;
  const isSelected = Boolean(rest.isSelected);
  const isFocused = Boolean(rest.isFocused);
  const isDragging = Boolean(rest.isCardDragging);
  if (zoom < LOD_ZOOM_THRESHOLD && !isSelected && !isFocused && !isDragging) {
    return <NoteCardLOD note={note} allNotes={allNotes} {...(rest as unknown as NoteCardProps)} />;
  }
  return <ImageNoteCard note={note} allNotes={allNotes} {...rest} />;
});

type CanvasCardProps = (TextCardProps | ImageCardProps) & {
  /** Raw edit flag from App; cover state is applied here where `note` lives. */
  editingRequested?: boolean;
};

/** Single canvas entry point: resolves the note and picks text vs image presentation. */
export const CanvasCard: React.FC<CanvasCardProps> = React.memo(({ noteId, editingRequested, ...rest }) => {
  const note = useNote(noteId);
  const allNotes = useNotesList();
  if (!note) return null;
  const shouldStartEditing = !!editingRequested && !note.isCovered;
  const isSelected = Boolean(rest.isSelected);
  const isFocused = Boolean(rest.isFocused);
  const isDragging = Boolean(rest.isCardDragging);
  const zoom = rest.zoom ?? 1;

  // Level-of-Detail (LOD): render ultra-lightweight card preview at low zoom levels (< 0.35)
  // when the card is not active (not selected, focused, dragged, or editing).
  if (zoom < LOD_ZOOM_THRESHOLD && !isSelected && !isFocused && !isDragging && !shouldStartEditing) {
    return <NoteCardLOD note={note} allNotes={allNotes} {...(rest as TextCardProps)} />;
  }

  if (note.imageUrl) {
    return <ImageNoteCard note={note} allNotes={allNotes} shouldStartEditing={shouldStartEditing} {...(rest as ImageCardProps)} />;
  }
  return <NoteCard note={note} allNotes={allNotes} shouldStartEditing={shouldStartEditing} {...(rest as TextCardProps)} />;
});

