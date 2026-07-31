import type { Experiment } from './types';

export const experiments: Experiment[] = [
  {
    id: 'kiwi-stratona', slug: 'kivi-stratona', title: 'Киви Стратона: путь от семени до цветения',
    summary: 'Длительный опыт выращивания киви из семян в климатических условиях Донбасса.',
    plantIds: ['kiwi-stratona'], status: 'продолжается', goal: 'Проследить жизненный цикл растения и возможность цветения в саду автора.',
    timeline: [
      { year: 2004, title: 'Начало эксперимента', description: 'Ориентировочная точка по длительности опыта. Точный год посева должен подтвердить автор.', images: [] },
      { year: 2026, title: 'Первые цветки', description: 'В текущем сезоне замечены первые цветки; по наблюдению автора они мужские.', images: [], result: 'Цветение зафиксировано, плодоношение не подтверждено.' },
    ],
    images: ['/images/experiments/kivi-stratona/failed-graft-on-arguta.jpg'], videos: [{ src: '/images/experiments/kivi-stratona/2026/kivi-stratona-cvetenie.mp4', title: 'Киви Стратона: цветение, 2026' }], observations: ['Растения проходили многолетние зимовки в саду автора.', 'После повреждений растения продолжали развиваться.'],
    results: ['Получено первое цветение мужского типа.'], problems: ['Хронология прошлых лет ещё не оцифрована.', 'Нет женского цветения для завязывания плодов.', 'Зафиксирована неудавшаяся прививка киви Стратона на актинидию аргуту.'],
    nextSteps: ['Добавить фотографии по годам.', 'Уточнить даты посадки, повреждений и восстановления.', 'Продолжить наблюдение за цветением.'], relatedArticles: ['kivi-stratona-pervoe-cvetenie'],
  },
  {
    id: 'persimmon-graft', slug: 'privivka-hurmy-wonderful', title: 'Прививка хурмы Wonderful',
    summary: 'Наблюдение за прививкой гибридной хурмы на виргинском подвое «Белогорье».',
    plantIds: ['persimmon-wonderful'], status: 'продолжается', goal: 'Зафиксировать развитие, зимовку, цветение и перспективу плодоношения прививки.',
    timeline: [{ year: 2026, title: 'Цветение прививки', description: 'Прививка цвела. Точная дата и фотодокументация ожидаются от автора.', images: [] }],
    images: ['/images/plants/hurma-wonderful/hurma-wonderful-cvetenie.jpg'], observations: ['Цветение подтверждено автором и фотографией.'], results: [], problems: ['Плодоношение конкретной прививки Wonderful пока не подтверждено.'],
    nextSteps: ['Уточнить написание названия сорта.', 'Добавить дату прививки и фотографии по сезонам.'], relatedArticles: [],
  },
];

export const getExperiment = (slug: string) => experiments.find((experiment) => experiment.slug === slug);
