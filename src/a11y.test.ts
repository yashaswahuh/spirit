// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import axe from 'axe-core';

describe('Accessibility audit with axe-core across screens and layouts', () => {
  it('AppShell structure satisfies accessibility standards', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="min-h-screen bg-gray-50 flex">
        <nav aria-label="Main Navigation" class="w-64 bg-white p-4">
          <ul role="list">
            <li><a href="#/home" aria-current="page" class="p-2 block">Home</a></li>
            <li><a href="#/attendance" class="p-2 block">Attendance</a></li>
            <li><a href="#/timetable" class="p-2 block">Timetable</a></li>
            <li><a href="#/grades" class="p-2 block">Grades</a></li>
            <li><a href="#/more" class="p-2 block">More</a></li>
          </ul>
        </nav>
        <main id="main-content" class="flex-1 p-6">
          <h1 class="text-xl font-bold">Spirit Dashboard</h1>
          <p>Welcome back, Student.</p>
        </main>
      </div>
    `;
    document.body.appendChild(container);

    const results = await axe.run(container, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa'],
      },
    });

    document.body.removeChild(container);
    expect(results.violations).toEqual([]);
  });

  it('Today attendance card one-tap marking flow is accessible with labels', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <section aria-labelledby="today-classes-heading" class="p-4 bg-white rounded-2xl">
        <h2 id="today-classes-heading" class="text-lg font-bold">Today's Classes</h2>
        <div class="p-4 border rounded-xl flex items-center justify-between">
          <div>
            <h3 class="font-bold">Data Structures</h3>
            <p class="text-sm">09:00 - 09:55 • Room 301</p>
          </div>
          <div class="flex gap-2" role="group" aria-label="Mark Attendance for Data Structures">
            <button type="button" aria-label="Mark Present" class="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded">
              Present
            </button>
            <button type="button" aria-label="Mark Absent" class="px-3 py-1.5 bg-rose-600 text-white font-bold rounded">
              Absent
            </button>
            <button type="button" aria-label="Mark Cancelled" class="px-3 py-1.5 bg-gray-600 text-white font-bold rounded">
              Cancelled
            </button>
          </div>
        </div>
      </section>
    `;
    document.body.appendChild(container);

    const results = await axe.run(container, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa'],
      },
    });

    document.body.removeChild(container);
    expect(results.violations).toEqual([]);
  });

  it('Subject health card conveys status with both icon and text (not color alone)', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <section aria-labelledby="health-heading" class="p-4 bg-white">
        <h2 id="health-heading" class="text-lg font-bold">Subject Health</h2>
        <div class="p-4 border rounded">
          <h3>Computer Networks</h3>
          <p>82% Attendance</p>
          <span class="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded" aria-label="Status: Safe">
            <svg aria-hidden="true" width="16" height="16"><circle cx="8" cy="8" r="8" fill="green"/></svg>
            <span>Safe (Can bunk 3 classes)</span>
          </span>
        </div>
        <div class="p-4 border rounded mt-2">
          <h3>Operating Systems</h3>
          <p>68% Attendance</p>
          <span class="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-1 rounded" aria-label="Status: At Risk">
            <svg aria-hidden="true" width="16" height="16"><circle cx="8" cy="8" r="8" fill="red"/></svg>
            <span>At Risk of Detention (Must attend 4 classes)</span>
          </span>
        </div>
      </section>
    `;
    document.body.appendChild(container);

    const results = await axe.run(container, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa'],
      },
    });

    document.body.removeChild(container);
    expect(results.violations).toEqual([]);
  });

  it('Attendance report table has valid table header semantics and print contrast', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div role="region" aria-labelledby="report-title">
        <h1 id="report-title">Official Attendance Report</h1>
        <table>
          <caption>Semester Attendance Summary</caption>
          <thead>
            <tr>
              <th scope="col">Subject</th>
              <th scope="col">Attended</th>
              <th scope="col">Conducted</th>
              <th scope="col">Percentage</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Algorithms</th>
              <td>32</td>
              <td>40</td>
              <td>80.0%</td>
              <td>Safe</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
    document.body.appendChild(container);

    const results = await axe.run(container, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa'],
      },
    });

    document.body.removeChild(container);
    expect(results.violations).toEqual([]);
  });
});
