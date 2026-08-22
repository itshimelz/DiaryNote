import React from 'react';
import { NoteCard } from './index';
import { ImageNoteCard } from './ImageNoteCard';
import type { NoteCardProps } from './types';
import type { ImageNoteCardProps } from './ImageNoteCard';
import { useNote, useNotesList } from '../../stores/notesStore';

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
  return <NoteCard note={note} allNotes={allNotes} {...rest} />;
});

export const ConnectedImageNoteCard: React.FC<ImageCardProps> = React.memo(({ noteId, ...rest }) => {
  const note = useNote(noteId);
  const allNotes = useNotesList();
  if (!note) return null;
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
  if (note.imageUrl) {
    return <ImageNoteCard note={note} allNotes={allNotes} shouldStartEditing={shouldStartEditing} {...(rest as ImageCardProps)} />;
  }
  return <NoteCard note={note} allNotes={allNotes} shouldStartEditing={shouldStartEditing} {...(rest as TextCardProps)} />;
});

