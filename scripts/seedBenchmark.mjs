// Benchmark dataset generator for testing 50,000 synthetic notes
import { writeFileSync } from 'fs';

function generateBenchmarkNotes(count = 50000) {
  console.log(`Generating ${count} benchmark notes...`);
  const notes = [];
  const cols = Math.ceil(Math.sqrt(count));
  const spacing = 420;

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    notes.push({
      id: `bench-note-${i}`,
      title: `Benchmark Note #${i + 1}`,
      content: `Synthetic performance test payload for note ${i + 1}. Cross reference mention @[Benchmark Note #1].`,
      x: col * spacing,
      y: row * spacing,
      width: 380,
      height: 340,
      paperTheme: i % 2 === 0 ? 'white' : 'dark',
      fontFamily: 'sans',
      fontSize: 'sm',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const output = JSON.stringify(notes, null, 2);
  writeFileSync('benchmark-50k-notes.json', output);
  console.log(`Successfully wrote ${count} notes to benchmark-50k-notes.json (${(output.length / 1024 / 1024).toFixed(2)} MB)`);
}

generateBenchmarkNotes(50000);
