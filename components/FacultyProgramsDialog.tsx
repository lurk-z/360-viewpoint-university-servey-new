'use client';

import { useEffect, useState } from 'react';
import { localizeContent, type ContentSource, type PublicContentSnapshot } from '../src/content';
import type { Locale, SceneId } from '../src/tour-data';
import { message } from '../src/i18n';
import { ModalDialog } from './ModalDialog';

interface FacultyProgramsDialogProps {
  readonly open: boolean;
  readonly locale: Locale;
  readonly content: PublicContentSnapshot;
  readonly initialFacultyId?: string;
  readonly initialProgramId?: string;
  readonly onClose: () => void;
  readonly onNavigate: (sceneId: SceneId) => void;
}

function SourceLine({ source, locale }: { readonly source: ContentSource; readonly locale: Locale }) {
  return (
    <p className="academics-source">
      <strong>{message(locale, 'sourceLabel')}:</strong>
      {source.url ? (
        <a href={source.url} target="_blank" rel="noopener noreferrer">
          {localizeContent(source.label, locale)}
        </a>
      ) : <span>{localizeContent(source.label, locale)}</span>}
    </p>
  );
}

export default function FacultyProgramsDialog({
  open,
  locale,
  content,
  initialFacultyId,
  initialProgramId,
  onClose,
  onNavigate
}: FacultyProgramsDialogProps) {
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>();
  const [selectedProgramId, setSelectedProgramId] = useState<string>();

  useEffect(() => {
    if (!open) return;
    const initialProgram = initialProgramId
      ? content.programs.find((program) => program.id === initialProgramId)
      : undefined;
    setSelectedFacultyId(initialProgram?.facultyId ?? initialFacultyId);
    setSelectedProgramId(initialProgram?.id);
  }, [content.programs, initialFacultyId, initialProgramId, open]);

  const selectedFaculty = content.faculties.find((faculty) => faculty.id === selectedFacultyId);
  const facultyPrograms = selectedFaculty
    ? content.programs.filter((program) => program.facultyId === selectedFaculty.id)
    : [];
  const programGroups = Array.from(facultyPrograms.reduce((groups, program) => {
    const key = program.department ? localizeContent(program.department, locale) : message(locale, 'otherProgramsDepartment');
    const entries = groups.get(key) ?? [];
    entries.push(program);
    groups.set(key, entries);
    return groups;
  }, new Map<string, typeof facultyPrograms>()));
  const selectedProgram = facultyPrograms.find((program) => program.id === selectedProgramId);
  const selectedFacultySceneId = selectedFaculty?.sceneId;
  const alternativeLocale = locale === 'th' ? 'en' : 'th';
  const layoutClass = `academics-layout${selectedFaculty ? ' has-faculty' : ''}${selectedProgram ? ' has-program' : ''}`;

  const chooseFaculty = (facultyId: string): void => {
    setSelectedFacultyId(facultyId);
    setSelectedProgramId(undefined);
  };

  return (
    <ModalDialog
      open={open}
      titleId="academics-dialog-title"
      wide
      closeLabel={message(locale, 'close')}
      onClose={onClose}
    >
      <p className="eyebrow">{message(locale, 'academicsEyebrow')}</p>
      <h2 id="academics-dialog-title">{message(locale, 'academicsTitle')}</h2>
      <p className="dialog-description">{message(locale, 'academicsDescription')}</p>

      <div className={layoutClass}>
        <nav className="academics-faculties" aria-label={message(locale, 'facultiesLabel')}>
          <h3>{message(locale, 'facultiesLabel')}</h3>
          {content.faculties.length > 0 ? content.faculties.map((faculty) => (
            <button
              className={faculty.id === selectedFacultyId ? 'is-active' : ''}
              type="button"
              key={faculty.id}
              aria-pressed={faculty.id === selectedFacultyId}
              onClick={() => chooseFaculty(faculty.id)}
            >
              <strong>{localizeContent(faculty.name, locale)}</strong>
              <span>{localizeContent(faculty.summary, locale)}</span>
            </button>
          )) : <p className="academics-empty">{message(locale, 'noFaculties')}</p>}
        </nav>

        <section className="academics-programs" aria-label={message(locale, 'programsLabel')}>
          <button
            className="academics-back"
            type="button"
            onClick={() => {
              setSelectedFacultyId(undefined);
              setSelectedProgramId(undefined);
            }}
          >
            <span aria-hidden="true">←</span> {message(locale, 'backToFaculties')}
          </button>
          {selectedFaculty ? <>
            <div className="academics-faculty-summary">
              <h3>{localizeContent(selectedFaculty.name, locale)}</h3>
              <p className="scene-alt-title">{localizeContent(selectedFaculty.name, alternativeLocale)}</p>
              <p>{localizeContent(selectedFaculty.description, locale)}</p>
              <SourceLine source={selectedFaculty.source} locale={locale} />
            </div>
            <h3>{message(locale, 'programsLabel')}</h3>
            {facultyPrograms.length > 0 ? (
              <div className="academics-program-list">
                {programGroups.map(([department, programs]) => (
                  <section className="academics-program-group" key={department}>
                    <h4>{department}</h4>
                    {programs.map((program) => (
                      <button
                        className={program.id === selectedProgramId ? 'is-active' : ''}
                        type="button"
                        key={program.id}
                        aria-pressed={program.id === selectedProgramId}
                        onClick={() => setSelectedProgramId(program.id)}
                      >
                        <strong>{localizeContent(program.name, locale)}</strong>
                        <span>{localizeContent(program.level, locale)}</span>
                      </button>
                    ))}
                  </section>
                ))}
              </div>
            ) : <p className="academics-empty">{message(locale, 'noPrograms')}</p>}
          </> : <p className="academics-empty academics-empty--prompt">{message(locale, 'selectFaculty')}</p>}
        </section>

        <article className="academics-detail" aria-live="polite">
          {selectedProgram ? <>
            <button className="academics-back" type="button" onClick={() => setSelectedProgramId(undefined)}>
              <span aria-hidden="true">←</span> {message(locale, 'backToPrograms')}
            </button>
            <p className="eyebrow">{localizeContent(selectedProgram.level, locale)}</p>
            <h3>{localizeContent(selectedProgram.name, locale)}</h3>
            <p className="scene-alt-title">{localizeContent(selectedProgram.name, alternativeLocale)}</p>
            {selectedFaculty ? (
              <section className="academics-program-faculty" aria-label={message(locale, 'programFacultyLabel')}>
                <span>{message(locale, 'programFacultyLabel')}</span>
                <strong>{localizeContent(selectedFaculty.name, locale)}</strong>
                <div className="academics-program-faculty__actions">
                  <button type="button" onClick={() => setSelectedProgramId(undefined)}>
                    {message(locale, 'viewFacultyDetails')}
                  </button>
                  {selectedFacultySceneId ? (
                    <button
                      className="is-primary"
                      type="button"
                      onClick={() => onNavigate(selectedFacultySceneId)}
                    >
                      {message(locale, 'goToFacultyScene')}
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}
            {selectedProgram.imageUrl ? (
              <img
                className="academics-program-image"
                src={selectedProgram.imageUrl}
                alt={localizeContent(selectedProgram.name, locale)}
                loading="lazy"
              />
            ) : null}
            <p className="academics-program-summary">{localizeContent(selectedProgram.summary, locale)}</p>
            <dl className="academics-program-facts">
              {selectedProgram.department ? <>
                <dt>{message(locale, 'departmentLabel')}</dt>
                <dd>{localizeContent(selectedProgram.department, locale)}</dd>
              </> : null}
              <dt>{message(locale, 'programLevel')}</dt>
              <dd>{localizeContent(selectedProgram.level, locale)}</dd>
              <dt>{message(locale, 'admissionLabel')}</dt>
              <dd>{localizeContent(selectedProgram.admission, locale)}</dd>
            </dl>
            <h4>{message(locale, 'programDetails')}</h4>
            <p className="academics-program-description">{localizeContent(selectedProgram.description, locale)}</p>
            <SourceLine source={selectedProgram.source} locale={locale} />
          </> : <p className="academics-empty academics-empty--prompt">{message(locale, 'selectProgram')}</p>}
        </article>
      </div>
    </ModalDialog>
  );
}
