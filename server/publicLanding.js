/** Shape of GET /api/landing — used by the API and by the static fallback. */

const isVisible = (item) => item.visible !== false;
const average = (numbers) => (numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0);

export function publicLanding(data) {
  const page = data.landingPage;
  return {
    ...page,
    nav: page.nav.filter(isVisible),
    stats: page.stats.filter(isVisible),
    benefits: page.benefits.filter(isVisible),
    steps: page.steps.filter(isVisible),
    faq: page.faq.filter(isVisible),
    courses: data.courses.filter((c) => isVisible(c) && c.showOnSite !== false).map((course) => {
      const groupIds = data.groups.filter((g) => g.courseId === course.id).map((g) => g.id);
      const reviews = (data.lessonReviews ?? []).filter((r) => groupIds.includes(r.groupId));
      return {
        ...course,
        studentsCount: data.students.filter((st) => st.courseId === course.id && st.status === 'active').length,
        lessonsPerWeek: String(course.schedule ?? '').split('/').filter((part) => part.trim()).length || null,
        rating: reviews.length ? Number(average(reviews.map((r) => r.rating)).toFixed(1)) : null,
        reviewCount: reviews.length,
        teachers: [...new Set(data.groups.filter((g) => g.courseId === course.id).map((g) => g.teacherName).filter(Boolean))],
      };
    }),
    teachers: data.teachers
      .filter((t) => isVisible(t) && t.showOnSite !== false && t.status === 'active')
      .map(({ email, phone, ...rest }) => {
        const reviews = (data.lessonReviews ?? []).filter((r) => r.teacherId === rest.id);
        return {
          ...rest,
          studentsCount: data.students.filter((st) => (rest.groups ?? []).includes(st.groupId)).length,
          rating: reviews.length ? Number(average(reviews.map((r) => r.rating)).toFixed(1)) : null,
          reviewCount: reviews.length,
        };
      }),
    results: data.ieltsResults.filter((r) => isVisible(r) && r.featured),
    testimonials: data.testimonials.filter(isVisible),
    events: data.events.filter(isVisible),
    branches: (data.branches ?? []).filter(isVisible).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    media: (data.mediaPosts ?? []).filter(isVisible).sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? ''))),
    announcements: (data.announcements ?? [])
      .filter((a) => isVisible(a) && (a.audience?.kind ?? 'all') === 'all')
      .slice(-3),
    settings: data.websiteSettings ?? {},
  };
}
