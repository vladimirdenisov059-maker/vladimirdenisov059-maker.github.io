import type { GardenTask } from './types';

export const gardenTasks: GardenTask[] = [
  { month: 2, title: 'Проверить зимние укрытия', description: 'Осмотреть крепления и вентиляцию укрытых культур без преждевременного раскрытия.', category: 'Зимовка', plantIds: [], priority: 'важная' },
  { month: 3, title: 'Подготовить инструменты к обрезке', description: 'Очистить и продезинфицировать секаторы; сроки работ определять по погоде и состоянию растений.', category: 'Обрезка', plantIds: [], priority: 'обычная' },
  { month: 5, title: 'Наблюдать цветение и опыление', description: 'Фиксировать даты цветения мужских и женских растений, погоду и активность опылителей.', category: 'Наблюдения', plantIds: ['actinidia-arguta', 'kiwi-stratona'], priority: 'важная' },
  { month: 6, title: 'Подвязать молодые побеги', description: 'Направить прирост лиан и ежевики, не допуская перетяжек.', category: 'Формировка', plantIds: ['actinidia-arguta', 'blackberry-natchez'], priority: 'обычная' },
  { month: 8, title: 'Фотографировать созревание', description: 'Снять общий вид, плод на растении, разрез и масштаб; записать дату.', category: 'Документация', plantIds: [], priority: 'обычная' },
  { month: 10, title: 'Подвести итоги сезона', description: 'Записать урожай, повреждения, удачные приёмы и задачи на следующий год.', category: 'Дневник', plantIds: [], priority: 'важная' },
];
