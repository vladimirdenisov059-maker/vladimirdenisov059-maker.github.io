import type { Plant } from './types';

export const plants: Plant[] = [
  {
    id: 'actinidia-arguta', slug: 'aktinidiya-arguta', name: 'Актинидия аргута',
    latinName: 'Actinidia arguta', category: 'Лианы', description: 'Сад из шести сортов мини-киви плодоносит у Владимира более 20 лет.',
    images: ['/images/plants/kivi/kivi-kievskaya-krupnoplodnaya.jpg','/images/plants/kivi/kivi-krasnoplodnoe.jpg','/images/plants/kivi/kivi-moskovskiy-kolbasinoy.jpg'], yearsInGarden: 20, status: 'плодоносит', pollination: 'Нужны мужские и женские растения; конкретная схема требует описания автора.',
    winterHardiness: 'Подтверждена многолетним опытом автора в его саду; точные температуры не зафиксированы.',
    experimental: false, personalNotes: 'Ценная культура для отдельного подробного дневника сортов, цветения, опыления и урожаев.',
    advantages: ['Многолетнее плодоношение в саду автора', 'Шесть сортов для будущего сравнения'],
    disadvantages: ['Требует корректного подбора опылителя'], relatedArticles: ['aktinidiya-dvadcat-let'],
    confirmationNeeded: ['Названия шести сортов', 'Сроки цветения и созревания', 'Урожайность по годам'],
  },
  {
    id: 'kiwi-stratona', slug: 'kivi-stratona', name: 'Киви Стратона', category: 'Лианы', variety: 'Стратона',
    description: 'Общий опыт с киви Стратона длится около 22 лет. Первые примерно 15 лет автор высаживал саженцы, полученные от Стратона; выращивание из семян началось только после 2019 года. В 2026 году у семенных растений появились первые мужские цветки.',
    images: [], yearsInGarden: 22, status: 'эксперимент', experimental: true,
    personalNotes: 'Один из центральных сюжетов сайта — двухэтапная история: около 15 лет посадок саженцев от Стратона, затем посев семян после 2019 года и первое мужское цветение семенных растений в 2026 году.',
    advantages: ['Уникальная история двух этапов опыта: саженцы и семенные растения'], disadvantages: ['Плодоношение пока не подтверждено'],
    relatedArticles: ['kivi-stratona-pervoe-cvetenie'], confirmationNeeded: ['Точный год посева после 2019 года', 'Даты ключевых зимовок'],
  },
  {
    id: 'red-flesh-apples', slug: 'krasnomyakotnye-yabloni', name: 'Красномякотные яблони', category: 'Плодовые',
    description: 'Яблони с красной мякотью плодов, растущие на участке автора.', images: ['/images/plants/krasnomyakotnye-yabloni/yabloko-krasnomyakotnoe.jpg','/images/plants/krasnomyakotnye-yabloni/yabloko-krasnomyakotnoe-2.jpg'], status: 'плодоносит', experimental: false,
    personalNotes: 'Для публикации особенно важны фотографии разреза плодов и точные подписи сортов.',
    advantages: ['Выразительный цвет мякоти'], disadvantages: ['Характеристики сортов требуют подтверждения'], relatedArticles: [],
    confirmationNeeded: ['Названия сортов', 'Вкус', 'Сроки созревания', 'Урожайность'],
  },
  {
    id: 'persimmon-wonderful', slug: 'hurma-wonderful', name: 'Хурма Wonderful', category: 'Плодовые', variety: 'Wonderful',
    description: 'Прививка гибридной хурмы на подвое хурмы виргинской «Белогорье» уже цвела.', images: ['/images/plants/hurma-wonderful/hurma-wonderful-cvetenie.jpg'], status: 'эксперимент', experimental: true,
    personalNotes: 'Дневник прививки должен показать совместимость, зимовки, цветение и дальнейший результат.',
    advantages: ['Прививка дошла до цветения'], disadvantages: ['Плодоношение не подтверждено'], relatedArticles: [],
    confirmationNeeded: ['Правильность написания Wonderful', 'Дата прививки', 'Дата цветения'],
  },
  {
    id: 'blackberry-natchez', slug: 'ezhevika/natchez', name: 'Ежевика Натчез', category: 'Ягодные', variety: 'Натчез',
    description: 'Один из давно плодоносящих бесшипных сортов ежевики в саду автора.', images: [], status: 'плодоносит', thornless: true, experimental: false,
    personalNotes: 'Сорт войдёт в сравнительную таблицу после получения записей автора.', advantages: ['Бесшипный сорт'],
    disadvantages: ['Численные характеристики пока не предоставлены'], relatedArticles: [], confirmationNeeded: ['Размер ягод', 'Срок созревания', 'Зимовка и укрытие'],
  },
  {
    id: 'blackberry-black-gem', slug: 'ezhevika/black-gem', name: 'Ежевика Блэк Джем', category: 'Ягодные', variety: 'Блэк Джем',
    description: 'Бесшипный ремонтантный сорт из коллекции автора.', images: ['/images/plants/ezhevika/ezhevika-black-gem.jpg'], status: 'плодоносит', thornless: true, remontant: true, experimental: false,
    personalNotes: 'Нужны авторские наблюдения для сравнения двух волн плодоношения.', advantages: ['Бесшипность', 'Ремонтантность'],
    disadvantages: ['Характеристики требуют записей автора'], relatedArticles: [],
  },
  {
    id: 'raspberry', slug: 'malina', name: 'Малина', category: 'Ягодные',
    description: 'В саду выращиваются бесшипные сорта Гестия и Джоан Джей.', images: ['/images/plants/malina/malina-gestiya.jpg','/images/plants/malina/malina-joan-j.jpg','/images/plants/malina/malina-joan-j-sneg.jpg'], status: 'плодоносит', thornless: true, experimental: false,
    personalNotes: 'Будет подготовлено сравнение сортов после получения наблюдений.', advantages: ['Два сорта для сравнения'], disadvantages: ['Данные ещё не оцифрованы'], relatedArticles: [],
  },
  {
    id: 'actinidia-purple', slug: 'aktinidiya-purpurnaya', name: 'Актинидия пурпурная', category: 'Лианы',
    description: 'Актинидия пурпурная из личной коллекции Владимира.', images: ['/images/plants/aktinidiya-purpurnaya/aktinidiya-purpurnaya.jpg'], status: 'плодоносит', experimental: false,
    personalNotes: 'Авторская фотография добавлена; сорт и подробности выращивания ожидают уточнения.', advantages: ['Растёт в саду автора'], disadvantages: ['Сортовые характеристики пока не описаны'], relatedArticles: [], confirmationNeeded: ['Сорт', 'Возраст растения', 'Особенности зимовки'],
  },
  {
    id: 'hawthorn-shurenok', slug: 'boyaryshnik-shurenok', name: 'Боярышник розовый Шурёнок', category: 'Плодовые', variety: 'Шурёнок',
    description: 'Розовый боярышник из сада Владимира.', images: ['/images/plants/boyaryshnik-shurenok/boyaryshnik-rozovyy-shurenok.jpg'], status: 'плодоносит', experimental: false,
    personalNotes: 'Добавлена авторская фотография плодов.', advantages: ['Есть фотонаблюдение'], disadvantages: ['Описание сорта требует проверки'], relatedArticles: [], confirmationNeeded: ['Правильность написания названия', 'Срок созревания', 'Вкус'],
  },
  {
    id: 'pear-chingizitka', slug: 'grusha-chingizitka', name: 'Груша Чингизитка', category: 'Плодовые', variety: 'Чингизитка',
    description: 'Груша Чингизитка, представленная авторскими фотографиями растения и плодов.', images: ['/images/plants/grusha-chingizitka/grusha-chingizitka.jpg','/images/plants/grusha-chingizitka/grusha-chingizitka-ves.jpg'], status: 'плодоносит', experimental: false,
    personalNotes: 'Подпись второго снимка «вес» требует расшифровки автора.', advantages: ['Два авторских снимка'], disadvantages: ['Характеристики ещё не оцифрованы'], relatedArticles: [], confirmationNeeded: ['Происхождение сорта', 'Смысл подписи «вес»', 'Срок созревания'],
  },
  {
    id: 'dogwood', slug: 'kizil', name: 'Кизил', category: 'Плодовые', description: 'Кизил, который, по наблюдению автора, каждый год цветёт под снегом. На одном деревце привиты разные сорта; урожайность на прививках кратно выше.',
    images: ['/images/plants/kizil/kizil-cvetet-pod-snegom.jpg','/images/plants/kizil/kizil.jpg'],
    videos: [{ src: '/images/plants/kizil/kizil-privivki-sortov-2026.mp4', title: 'Разные сорта кизила на одном деревце: урожайность прививок', poster: '/images/plants/kizil/kizil-privivki-sortov-2026.jpg' }],
    status: 'плодоносит', experimental: false, personalNotes: 'Фотографии фиксируют раннее цветение под снегом, а авторское видео показывает разные сорта на одном деревце и кратно более высокую урожайность на прививках.',
    advantages: ['Регулярное цветение наблюдается автором', 'Прививка разных сортов улучшает завязывание плодов', 'Урожайность на прививках кратно выше'], disadvantages: ['Названия привитых сортов ещё не указаны'], relatedArticles: [], confirmationNeeded: ['Названия привитых сортов', 'Год фотографии', 'Срок созревания'],
  },
  {
    id: 'paulownia', slug: 'pavlovniya', name: 'Павловния', category: 'Прочие', description: 'Павловния в саду Владимира; добавлена фотография листа.',
    images: ['/images/plants/pavlovniya/list-pavlovnii.jpg','/images/plants/pavlovniya/pavlovniya.jpg'], status: 'наблюдение', experimental: true, personalNotes: 'Нужна история зимовок и восстановления растения.',
    advantages: ['Есть авторское наблюдение'], disadvantages: ['Результат зимовки не описан'], relatedArticles: [], confirmationNeeded: ['Вид или сорт', 'Возраст', 'Зимовка'],
  },
  {
    id: 'peach-ice', slug: 'persik-ledyanoy', name: 'Персик Ледяной', category: 'Плодовые', variety: 'Ледяной', description: 'Персик Ледяной из сада автора.',
    images: ['/images/plants/persik-ledyanoy/persik-ledyanoy.jpg'], status: 'плодоносит', experimental: false, personalNotes: 'Сортовое название и характеристики следует подтвердить.',
    advantages: ['Есть фотография плода'], disadvantages: ['Нет оцифрованного описания'], relatedArticles: [], confirmationNeeded: ['Правильность названия', 'Срок созревания', 'Зимостойкость'],
  },
  {
    id: 'pasque-flower', slug: 'son-trava', name: 'Сон-трава', category: 'Прочие', description: 'Белая и фиолетовая формы сон-травы из сада Владимира.',
    images: ['/images/plants/son-trava/son-trava-belaya.jpg','/images/plants/son-trava/son-trava-fioletovaya.jpg'], status: 'плодоносит', experimental: false, personalNotes: 'Два авторских снимка показывают белое и фиолетовое цветение.',
    advantages: ['Две цветовые формы'], disadvantages: ['Ботаническое название требует уточнения'], relatedArticles: [], confirmationNeeded: ['Вид', 'Происхождение растений'],
  },
  {
    id: 'passionflower-north', slug: 'marakuya-severnaya', name: 'Маракуйя Северная', category: 'Лианы', description: 'Цветение растения, которое автор называет Северной Маракуйей.',
    images: ['/images/plants/marakuya-severnaya/cvetok-marakuyi-severnoy.jpg','/images/plants/marakuya-severnaya/cvetet-marakuya-severnaya.jpg','/images/plants/marakuya-severnaya/pervyy-plod-marakuyi-severnoy.jpg'], status: 'наблюдение', experimental: true, personalNotes: 'Используется авторское название; ботанический вид нужно подтвердить.',
    advantages: ['Цветение зафиксировано фотографией'], disadvantages: ['Точное определение не подтверждено'], relatedArticles: [], confirmationNeeded: ['Ботанический вид', 'Происхождение', 'Зимовка'],
  },  {
    id: 'japanese-quince', slug: 'ayva-yaponskaya', name: 'Айва японская (хеномелес)', category: 'Плодовые', description: 'Айва японская из сада Владимира.',
    images: ['/images/plants/ayva-yaponskaya/ayva-yaponskaya-henomeles.jpg'], status: 'плодоносит', experimental: false, personalNotes: 'Авторская фотография добавлена; сортовые сведения ожидают уточнения.', advantages: ['Есть плодоношение и фотонаблюдение'], disadvantages: ['Сорт не указан'], relatedArticles: [], confirmationNeeded: ['Сорт', 'Срок созревания', 'Использование плодов'],
  },
  {
    id: 'hawthorn-collection', slug: 'boyaryshnik', name: 'Коллекция боярышника', category: 'Плодовые', description: 'Неколючие, красные, розовые и желтоплодные формы боярышника из сада автора.',
    images: ['/images/plants/boyaryshnik/boyaryshnik-zheltyy-poyarkovoy.jpg','/images/plants/boyaryshnik/boyaryshnik-petushya-shpora-i-rozovyy.jpg','/images/plants/boyaryshnik/boyaryshnik-kitayskiy.jpg','/images/plants/boyaryshnik/boyaryshnik-poyarkovoy.jpg'], status: 'плодоносит', experimental: false, personalNotes: 'Фотоколлекция включает формы Поярковой, Китайский и Петушья шпора; подписи нужно сверить.', advantages: ['Несколько форм для сравнения'], disadvantages: ['Названия требуют авторской проверки'], relatedArticles: [], confirmationNeeded: ['Точные названия', 'Какие растения неколючие', 'Вкус и сроки созревания'],
  },
  {
    id: 'tree-peony', slug: 'pion-drevovidnyy', name: 'Пион древовидный махровый', category: 'Прочие', description: 'Махровый древовидный пион из сада Владимира.', images: ['/images/plants/pion-drevovidnyy/pion-drevovidnyy-mahrovyy.jpg'], status: 'наблюдение', experimental: false, personalNotes: 'Цветение зафиксировано авторской фотографией.', advantages: ['Выразительное цветение'], disadvantages: ['Сорт не указан'], relatedArticles: [], confirmationNeeded: ['Сорт', 'Возраст куста'],
  },
  {
    id: 'blackberry-thornfree', slug: 'ezhevika/thornfree', name: 'Ежевика Торнфри', category: 'Ягодные', variety: 'Торнфри', description: 'Бесшипная ежевика Торнфри из коллекции автора.', images: ['/images/plants/ezhevika/ezhevika-thornfree.jpg'], status: 'плодоносит', thornless: true, experimental: false, personalNotes: 'Авторская фотография добавлена для будущего сравнения сортов.', advantages: ['Бесшипность'], disadvantages: ['Характеристики ещё не оцифрованы'], relatedArticles: [], confirmationNeeded: ['Срок созревания', 'Зимовка', 'Урожайность'],
  },
  {
    id: 'blackberry-freedom', slug: 'ezhevika/freedom', name: 'Ежевика Фридом', category: 'Ягодные', variety: 'Фридом', description: 'Ежевика Фридом из коллекции Владимира.', images: ['/images/plants/ezhevika/ezhevika-freedom.jpg'], status: 'плодоносит', thornless: true, remontant: true, experimental: false, personalNotes: 'Точное полное название сорта следует подтвердить.', advantages: ['Бесшипность', 'Ремонтантность'], disadvantages: ['Полное название требует проверки'], relatedArticles: [], confirmationNeeded: ['Это Прайм Арк Фридом?', 'Сроки двух волн плодоношения'],
  },
  {
    id: 'schisandra', slug: 'limonnik-kitayskiy', name: 'Китайский лимонник', latinName: 'Schisandra chinensis', category: 'Лианы', description: 'Китайский лимонник из сада Владимира.', images: ['/images/plants/limonnik-kitayskiy/limonnik-kitayskiy.jpg'], status: 'плодоносит', experimental: false, personalNotes: 'Есть авторская фотография плодоношения.', advantages: ['Плодоношение в саду автора'], disadvantages: ['Агротехника ещё не описана'], relatedArticles: [], confirmationNeeded: ['Возраст растения', 'Срок созревания', 'Формировка'],
  },
  {
    id: 'gooseberry', slug: 'kryzhovnik-nekolyuchiy', name: 'Крыжовник неколючий', category: 'Ягодные', description: 'Неколючий крыжовник из сада автора.', images: ['/images/plants/kryzhovnik/kryzhovnik-nekolyuchiy.jpg'], status: 'плодоносит', thornless: true, experimental: false, personalNotes: 'Сорт нужно установить по записям Владимира.', advantages: ['Отсутствие колючек'], disadvantages: ['Сорт не указан'], relatedArticles: [], confirmationNeeded: ['Сорт', 'Вкус', 'Срок созревания'],
  },
  {
    id: 'crimean-snowdrops', slug: 'krymskie-podsnezhniki', name: 'Крымские подснежники', category: 'Прочие', description: 'Подснежники, которые, по наблюдению автора, цветут с февраля, в том числе под снегом.', images: ['/images/plants/krymskie-podsnezhniki/krymskie-podsnezhniki-pod-snegom.jpg'], status: 'наблюдение', experimental: false, personalNotes: 'Раннее цветение зафиксировано фотографией.', advantages: ['Очень раннее цветение'], disadvantages: ['Ботанический вид требует уточнения'], relatedArticles: [], confirmationNeeded: ['Ботанический вид', 'Год фотографии'],
  },
  {
    id: 'walnut-ideal', slug: 'oreh-ideal', name: 'Орех Идеал', category: 'Орехоплодные', variety: 'Идеал', description: 'Орех сорта Идеал из сада Владимира.', images: ['/images/plants/oreh-ideal/oreh-ideal.jpg'], status: 'плодоносит', experimental: false, personalNotes: 'Фотография добавлена; история выращивания будет уточнена.', advantages: ['Плодоношение зафиксировано'], disadvantages: ['Характеристики не оцифрованы'], relatedArticles: [], confirmationNeeded: ['Возраст дерева', 'Срок созревания', 'Зимовка'],
  },
  {
    id: 'peach-sunny-donbass', slug: 'persik-solnechnyy-donbass', name: 'Персик Солнечный Донбасс', category: 'Плодовые', variety: 'Солнечный Донбасс', description: 'Персик Солнечный Донбасс из сада автора.', images: ['/images/plants/persik-solnechnyy-donbass/persik-solnechnyy-donbass.jpg'], status: 'плодоносит', experimental: false, personalNotes: 'Название и история сорта требуют авторского пояснения.', advantages: ['Есть фотография плода'], disadvantages: ['Описание не оцифровано'], relatedArticles: [], confirmationNeeded: ['Происхождение названия', 'Срок созревания', 'Зимостойкость'],
  },
  {
    id: 'lagenaria', slug: 'lagenariya', name: 'Тыква лагенария', category: 'Прочие', description: 'Лагенария, выращенная Владимиром.', images: ['/images/plants/lagenariya/tykva-lagenariya.jpg'], status: 'плодоносит', experimental: false, personalNotes: 'Авторская фотография показывает полученный плод.', advantages: ['Плодоношение зафиксировано'], disadvantages: ['Сорт и назначение не указаны'], relatedArticles: [], confirmationNeeded: ['Разновидность', 'Способ выращивания'],
  },
  {
    id: 'mulberry', slug: 'shelkovica-krupnoplodnaya', name: 'Шелковица крупноплодная', category: 'Плодовые', description: 'Крупноплодная шелковица из сада Владимира.', images: ['/images/plants/shelkovica/shelkovica-krupnoplodnaya.jpg'], status: 'плодоносит', experimental: false, personalNotes: 'Плодоношение представлено авторской фотографией.', advantages: ['Крупные плоды по авторской подписи'], disadvantages: ['Сорт не указан'], relatedArticles: [], confirmationNeeded: ['Сорт', 'Цвет и вкус плодов', 'Срок созревания'],
  },  {
    id: 'pecan', slug: 'pekan', name: 'Пекан', category: 'Орехоплодные',
    description: 'Редкая для региона культура в коллекции сада; сведения будут дополнены дневником автора.', images: [], status: 'наблюдение', experimental: true,
    personalNotes: 'До получения записей не публикуются выводы о зимостойкости и урожае.', advantages: ['Редкая культура для Донбасса'], disadvantages: ['Результат требует документирования'], relatedArticles: [],
  },
];

export const getPlant = (slug: string) => plants.find((plant) => plant.slug === slug);
