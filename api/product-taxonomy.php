<?php
declare(strict_types=1);

function product_taxonomy_categories(): array {
    $tree = [
        'materials'=>['Строительные и отделочные материалы',['drymix'=>'Сухие смеси и затирки','tile'=>'Плитка и керамогранит','drywall'=>'Гипсокартон','profiles'=>'Профили и комплектующие','wood'=>'Фанера и пиломатериалы','insulation'=>'Утеплители','waterproof'=>'Гидроизоляция и мембраны','roof'=>'Кровельные материалы','decor'=>'Панели и декоративные материалы','doors'=>'Двери и комплектующие','wallpaper'=>'Обои','other'=>'Прочие стройматериалы']],
        'paint'=>['Краски и покрытия',['paint'=>'Краски и эмали','primers'=>'Грунтовки и бетоноконтакт','varnish'=>'Лаки','stain'=>'Морилки и пропитки','solvent'=>'Растворители','tint'=>'Колеры','decor'=>'Декоративные покрытия']],
        'chemicals'=>['Строительная химия',['foam'=>'Монтажная пена','sealants'=>'Герметики','glue'=>'Клеи','cleaners'=>'Очистители и смазки']],
        'hand'=>['Ручной и малярный инструмент',['pliers'=>'Плоскогубцы и кусачки','wrenches'=>'Ключи','screwdrivers'=>'Отвёртки','hammers'=>'Молотки и топоры','saws'=>'Ручные пилы и ножовки','knives'=>'Ножи и ножницы','measuring'=>'Измерительный инструмент','trowels'=>'Шпатели, кельмы и тёрки','rollers'=>'Валики и ручки','brushes'=>'Кисти','guns'=>'Пистолеты для пены и герметика','mixers'=>'Миксеры и насадки','clamps'=>'Струбцины и зажимы','staplers'=>'Степлеры и заклёпочники','storage'=>'Хранение инструмента','other'=>'Прочий ручной инструмент']],
        'power'=>['Электроинструмент',['drills'=>'Дрели и перфораторы','grinders'=>'Угловые шлифмашины','sanders'=>'Шлифовальные машины','saws'=>'Электропилы и лобзики','other'=>'Прочий электроинструмент']],
        'accessories'=>['Оснастка и расходники',['drillbits'=>'Свёрла, буры и коронки','discs'=>'Отрезные и пильные диски','abrasives'=>'Шлифовальные материалы','bits'=>'Биты и насадки','blades'=>'Полотна и сменные лезвия','other'=>'Прочая оснастка']],
        'plumbing'=>['Сантехника и водоснабжение',['faucets'=>'Смесители и душ','pipes'=>'Трубы','fittings'=>'Фитинги и соединения','valves'=>'Краны и вентили','hoses'=>'Шланги и подводки','siphons'=>'Сифоны и сливная арматура','fixtures'=>'Санфаянс и мойки','ventilation'=>'Вентиляция','other'=>'Комплектующие для сантехники']],
        'electrical'=>['Электрика и освещение',['lighting'=>'Лампы и светильники','cables'=>'Кабели и кабель-каналы','sockets'=>'Розетки и выключатели','breakers'=>'Автоматы и электрощиты','junction'=>'Клеммы и соединители','extension'=>'Удлинители','other'=>'Прочая электрика']],
        'fasteners'=>['Крепёж и фурнитура',['screws'=>'Саморезы и шурупы','dowels'=>'Дюбели','nails'=>'Гвозди и скобы','anchors'=>'Анкеры','hardware'=>'Болты, гайки и фурнитура','ties'=>'Хомуты и стяжки']],
        'garden'=>['Сад и строительный инвентарь',['tools'=>'Лопаты, грабли и садовый инструмент','watering'=>'Полив','wheelbarrows'=>'Тачки']],
        'safety'=>['Средства защиты',['gloves'=>'Перчатки','masks'=>'Респираторы и маски','eyes'=>'Очки и защита слуха','clothes'=>'Спецодежда и страховка']],
        'household'=>['Хозяйственные товары',['tapes'=>'Ленты и скотч','films'=>'Плёнки и укрывные материалы','ropes'=>'Верёвки и шнуры','cleaning'=>'Щётки, мётлы и уборка','containers'=>'Вёдра, тазы и мешки','other'=>'Прочие хозяйственные товары']],
        'other'=>['Прочие товары',[]]
    ];
    $tree['materials'][1]['floor']='Напольные покрытия и комплектующие';
    $tree['hand'][1]['ladders']='Лестницы и стремянки';
    $tree['accessories'][1]['welding']='Сварочные электроды';
    $tree['household'][1]['office']='Разметка и канцелярские товары';
    $tree['household'][1]['drinks']='Напитки';
    $tree['hand'][1]['tiletools']='Плиткорезы и присоски';
    $tree['household'][1]['gas']='Газовые баллоны и горелки';
    $tree['plumbing'][1]['pumps']='Насосы и насосные станции';
    $tree['plumbing'][1]['heating']='Отопление и расширительные баки';
    $tree['chemicals'][1]['additives']='Добавки для строительных смесей';
    $tree['hand'][1]['sets']='Наборы ручного инструмента';
    $tree['hand'][1]['chisels']='Стамески и долота';
    $tree['electrical'][1]['meters']='Мультиметры и измерители';
    $tree['materials'][1]['hatches']='Ревизионные люки';
    $tree['plumbing'][1]['filters']='Фильтры и картриджи для воды';
    $tree['electrical'][1]['floorheating']='Электрический тёплый пол';
    $rows=[];
    foreach($tree as $root=>[$name,$children]) {
        $rows[]=['id'=>'shop-'.$root,'name'=>$name,'parent_id'=>null,'is_active'=>true];
        foreach($children as $id=>$label)$rows[]=['id'=>'shop-'.$root.'-'.$id,'name'=>$label,'parent_id'=>'shop-'.$root,'is_active'=>true];
    }
    return $rows;
}

function product_taxonomy_match(string $name, string $sourcePath = ''): array {
    $priority=[
        'materials-drymix'=>'(?:кафельн|плиточн).*клей|клей.*(?:плитк|плиточ|керамогран)|армирующ.*(?:волокн|фибр)|микрофибра',
        'chemicals-foam'=>'пен[аы](?![а-яё])|strawfoam|soudabond',
        'chemicals-sealants'=>'силик\.|нейт.*силик',
        'chemicals-glue'=>'фикс алл|fix.?all|метилан|metylan|фиксатор резьбы',
        'materials-wood'=>'\bosb\b|осб',
        'materials-profiles'=>'гкл|профил.*(?:стен|маяч|окант)|направля.*(?:стен|потол)|краб.*профил|уголок.*(?:ароч|сетк)|(?:теневой|парящий).*профил',
        'materials-insulation'=>'пеноплекс|подложк',
        'materials-floor'=>'галтел|порог|деконика|бордюр.*(?:ванн|идеал)',
        'materials-roof'=>'руберойд|стеклоизол',
        'materials-other'=>'стеклосетк|^бетон$|сетка.*(?:оцинк|плетен)|оцинкован.*лист|провол[ок]+.*оцинк',
        'materials-waterproof'=>'ondutiss|ветрозащит|мастика.*кровельн',
        'accessories-abrasives'=>'наждак|шлифовальн.*блок',
        'accessories-welding'=>'электрод',
        'fasteners-hardware'=>'колесо.*(?:креплен|пов[ое]р)|уголок.*креп[её]ж|стусло',
        'safety-clothes'=>'каска|комбинезон',
        'safety-eyes'=>'щиток.*(?:защит|лицев|токар)',
        'hand-ladders'=>'стремянк|лестниц',
        'household-films'=>'целлофан|крафт.?бумаг|укрывочн.*бумаг|painters paper',
        'household-containers'=>'пакет|мерн.*стакан|ковш',
        'household-ropes'=>'^фал\s',
        'household-office'=>'маркер|карандаш',
        'power-other'=>'пылесос|воздуходувк'
    ];
    $extra = [
        'electrical-breakers'=>'счетчик|счётчик',
        'electrical-sockets'=>'диммер',
        'electrical-junction'=>'наконечник.*(?:штыр|медн|ншв)|термоусаж',
        'materials-decor'=>'угол.*пвх|терезе.*декор|бұрыш.*колонна',
        'materials-wood'=>'двп|дсп',
        'materials-roof'=>'унифлекс',
        'materials-other'=>'sikaemaco|накладк.*ремонт',
        'chemicals-cleaners'=>'жидкость.*снят.*крас',
        'accessories-drillbits'=>'набор.*кольцев.*пил',
        'accessories-discs'=>'пильн.*диск',
        'accessories-abrasives'=>'круг.*(?:лепест|торцев)|шлифовальн.*сетк',
        'accessories-other'=>'шина направляющ|соединител.*направляющ|аккумулятор|батаре',
        'fasteners-hardware'=>'петля|замок|полу.?круг',
        'power-saws'=>'сабельн.*пила|торцовочн.*пила|пила.*стусл',
        'power-grinders'=>'углошлиф',
        'power-sanders'=>'полировальн.*маш',
        'hand-tiletools'=>'присос|стеклодомкрат|плиткорез|ролик.*плиткорез',
        'hand-clamps'=>'распорн.*штанг',
        'household-tapes'=>'пэ.*малярн',
        'household-gas'=>'газ.*бал[ло]+н|горелк'
    ];
    foreach($extra as $id=>$pattern)$priority[$id]=isset($priority[$id])?$priority[$id].'|'.$pattern:$pattern;
    $refined=[
        'paint-decor'=>'keramogranit.*(?:жидк|кг)|декоративн.*(?:штукатур|паста)|ш[её]лк.*(?:декоратив|паста)|leonard|леонарад|марсель.*шелк',
        'paint-primers'=>'\bгрунт\b|\bprimer\b|putzgrund',
        'paint-solvent'=>'раз[бв]авител',
        'plumbing-pumps'=>'насос',
        'plumbing-heating'=>'расширительн.*бак|компл.*алюм.*рад',
        'plumbing-faucets'=>'гиги[е]?н.*душ|гигинич.*душ',
        'plumbing-fittings'=>'крестовин|бутылка.*канализ|мост.*(?:deniz|бел|q\d|мм)|арматура.*резб|уголок.*deniz|фильтр.*водопровод|резинка.*(?:кан|переход)',
        'plumbing-siphons'=>'арматура.*(?:unicorn|нижн|боков)',
        'materials-insulation'=>'трубка.*изоляцион',
        'materials-hatches'=>'ревизионн.*люк',
        'electrical-meters'=>'мультиметр|тестер.*цифров|детектор.*напряж',
        'electrical-breakers'=>'контактор|реле|щит.*(?:распред|монтаж)|din.?рейка',
        'electrical-junction'=>'коробка.*(?:установ|распред|развет)|зви|3ви|зв[иi]|ншви|тутк|шина.*соединител',
        'electrical-floorheating'=>'мат.*нагревательн',
        'electrical-sockets'=>'рамка.*(?:brite|nizmo|с/у)',
        'electrical-lighting'=>'патрон.*(?:e27|е27)|\blamp[аa]?\b|sv[-.]|свет-к|угол.*трек|оранжевый патрон',
        'electrical-cables'=>'провод.*пв-',
        'hand-pliers'=>'длинногуб|клещи|щипцы',
        'hand-chisels'=>'стамеск|стамесок|долото|зубил',
        'hand-screwdrivers'=>'отверток|отвёрток',
        'hand-sets'=>'набор инструмент',
        'hand-storage'=>'переноска.*инструмент|сумка.?пояс',
        'hand-mixers'=>'\bмиксер\b',
        'hand-clamps'=>'(?:пружинн|быстр).*зажим',
        'hand-staplers'=>'скобозабив',
        'hand-tiletools'=>'заусовщик|разламывател.*плит|подстолье.*плит',
        'materials-floor'=>'набор.*укладк.*ламинат',
        'materials-other'=>'клинья.*пальчик',
        'power-other'=>'гравер',
        'accessories-blades'=>'полотна|насадка.*нож',
        'accessories-drillbits'=>'сверел|свёрел',
        'accessories-other'=>'патрон.*дрел|адаптер.*защелка',
        'fasteners-hardware'=>'шпингалет',
        'fasteners-nails'=>'скобы.*(?:пистолет|тип-53)',
        'household-ropes'=>'капронов.*нить',
        'household-films'=>'нетканый материал',
        'household-cleaning'=>'губка.*целлюлоз',
        'safety-eyes'=>'защитн.*очки',
        'chemicals-additives'=>'противомороз|антимороз',
        'chemicals-cleaners'=>'гель.*удален',
        'materials-drymix'=>'sikaceram|ceresit.*(?:се|ce)\s*comfort',
        'plumbing-filters'=>'магистральный фильтр|картридж.*(?:фильтр|механич)',
        'plumbing-ventilation'=>'решетка.*d[0-9]'
    ];
    foreach($refined as $id=>$pattern)if(preg_match('~'.$pattern.'~iu',$name))return ['id'=>'shop-'.$id,'review'=>false];
    // Keep specific tile-system accessories out of general tool clamps.
    if(preg_match('/клин.*(?:вилка|ворот)|зажим.*(?:трехмер|трёхмер|ворот)/iu',$name))return ['id'=>'shop-materials-other','review'=>false];
    // A foam gun is a tool, even though its name includes "foam".
    if(preg_match('/пистолет.*(?:пен|герметик|силикон)/iu',$name))return ['id'=>'shop-hand-guns','review'=>false];
    foreach($priority as $id=>$pattern)if(preg_match('/'.$pattern.'/iu',$name))return ['id'=>'shop-'.$id,'review'=>false];
    // Specific product terms take priority over broad/occasionally incorrect 1C groups.
    $rules=[
        'hand-guns'=>'пистолет.*(?:пен|герметик|силикон)|(?:пен|герметик).*пистолет',
        'accessories-blades'=>'полотно|пилк[аи].*(?:лобзик|электро)|лезви|цепь.*пил',
        'accessories-bits'=>'\bбит[аы]\b|набор бит|бит[аы].*(?:торц|магнит)|насадк.*(?:отв[её]рт|шуруп)',
        'accessories-drillbits'=>'сверл|свёрл|\bбур(?:ы|а)?\b|коронк|сверлен',
        'accessories-discs'=>'диск.*(?:отрез|алмаз|пильн|металл)|круг.*отрез|чашк.*алмаз|алмаз.*чашк',
        'accessories-abrasives'=>'наждач|абразив|шлифовальн.*(?:лист|круг|сетк|губк|лент)|сетк.*шлиф|брусок.*шлиф|набор.*шлиф',
        'hand-mixers'=>'насадк.*миксер|миксер.*(?:d\d|диаметр|оцинк|краск|смес)',
        'power-drills'=>'перфоратор|шурупов[её]рт|электродрел|дрель',
        'power-grinders'=>'углов.*шлиф|\bушм\b|болгарк',
        'power-sanders'=>'шлифмаш|шлифовальн.*маш',
        'power-saws'=>'электролобзик|электропил|пила.*(?:циркуляр|торцов|аккум|цепн)',
        'power-other'=>'фен.*(?:техническ|строител)|краскопульт|пылесос.*стро|сварочн.*аппарат|генератор|компрессор|триммер',
        'paint-primers'=>'грунтовк|бетон.?контакт|бетоконтакт|аквагрунт|гидро.*грунт',
        'chemicals-foam'=>'монтажн.*пен|пен[аы].*(?:полиуретан|пистолет)|соуд[ао]фоам|\bfoam\b',
        'chemicals-sealants'=>'герметик|силикон|акрил.*шов',
        'chemicals-glue'=>'\bклей\b|жидк.*гвозд|\badhesive\b',
        'chemicals-cleaners'=>'очистител|обезжир|смазк|удалител|антисептик',
        'paint-varnish'=>'(?:^|\s)лак(?:\s|-|$)|лакиров',
        'paint-stain'=>'морилк|пропитк|олиф',
        'paint-solvent'=>'растворител|уайт.?спирит|ацетон',
        'paint-tint'=>'колер|колорант|пигмент',
        'paint-decor'=>'мокр.*шелк|венециан|микроцемент',
        'paint-paint'=>'краска|эмаль|краски',
        'materials-drymix'=>'затирк|litochrom|epoxid.*starlike|epoxy.*fuga|\bce\s*(?:33|40)\b|(?:с|c)е\s*(?:33|40)|шпатлев|шпаклев|штукатурк|наливн.*пол|стяжк|цемент|известь|\bпгс\b|пескобетон',
        'materials-waterproof'=>'гидроиз|пароиз|мембран|(?:cr|сr)\s*65|акваблок',
        'materials-tile'=>'керамогранит|кафель|керамич.*плитк|плиткорез.*диск',
        'materials-drywall'=>'гипсокартон',
        'materials-profiles'=>'подвес.*прям|профил.*(?:гипс|потол|направ)|соединител.*профил|маяк.*штукатур|уголок.*(?:штукатур|перфор)',
        'materials-wood'=>'фанер|доска.*(?:обрез|строг)|брус.*дерев',
        'materials-insulation'=>'утеплител|минват|пенопласт|пенополистир|экструд',
        'materials-roof'=>'рубероид|ондулин|черепиц|сайдинг',
        'materials-wallpaper'=>'обои',
        'materials-decor'=>'шпон|лувер|гибк.*мрамор|панел.*(?:стен|декор)|плинтус|багет',
        'materials-doors'=>'дверь|двери|дверн',
        'materials-other'=>'газоблок|кирпич|серпянк|стеклохолст|сетк.*(?:маляр|штукатур|кладоч)|крестик|свп|клин.*плит',
        'plumbing-faucets'=>'смесител|душев|душа|лейк.*душ',
        'plumbing-siphons'=>'сифон|слив.*арматур|гофра.*(?:сифон|унитаз)|выпуск.*(?:мойк|умывал)',
        'plumbing-ventilation'=>'воздуховод|вентиляц|анемостат|вентилятор',
        'plumbing-fixtures'=>'унитаз|умывальник|раковин|мойка|биде',
        'plumbing-hoses'=>'подводк|шланг.*(?:душ|смес|вода|стирал)',
        'plumbing-valves'=>'кран.*(?:шар|вод|ппр)|вентил|задвижк|клапан',
        'plumbing-fittings'=>'муфт|тройник|фитинг|отвод|редуктор.*вод|бутылк.*(?:водоп|бел)|арматура.*резьб|переход.*(?:ппр|вод|канал)|заглушк.*(?:вод|канал|deniz)|креплен.*(?:ппр|водоп)|хомут.*канализ',
        'plumbing-pipes'=>'труба|трубы|труб.*(?:ппр|канал|водоп|тепл.*пол)',
        'electrical-extension'=>'удлинител|сетев.*фильтр',
        'electrical-breakers'=>'автомат.*(?:выключ|[0-9]|iek|иэк)|дифавтомат|узо|щит.*элект|корпус.*щ[рн]|бокс.*модул',
        'electrical-sockets'=>'розетк|выключател|штепсел|вилк.*(?:электр|ip|ампер)',
        'electrical-lighting'=>'лампа|светильник|прожектор|гирлянд|светодиод|светов.*лент|треков.*(?:систем|питани)',
        'electrical-cables'=>'кабель|провод.*(?:ввг|пвс|шввп)|кабел.*канал|гофр.*(?:электр|пвх)|изолент',
        'electrical-junction'=>'клемм|шин[аы].*нулев|соединител.*электр',
        'fasteners-screws'=>'саморез|шуруп|шпильк',
        'fasteners-dowels'=>'дюбел',
        'fasteners-anchors'=>'анкер',
        'fasteners-nails'=>'гвозд|скоб.*степлер',
        'fasteners-hardware'=>'болт|гайк|шайб|заклепк|заклёпк|петл.*(?:двер|мебел)',
        'fasteners-ties'=>'хомут|стяжк.*(?:нейлон|кабел)',
        'hand-staplers'=>'степлер|заклепочник|заклёпочник',
        'hand-pliers'=>'плоскогуб|пассатиж|тонкогуб|бокорез|кусач|зачистк.*провод|инструмент.*провод',
        'hand-wrenches'=>'ключ|головк.*торц|трещотк',
        'hand-screwdrivers'=>'отвертк|отвёртк',
        'hand-hammers'=>'молоток|молотк|киянк|кувалд|топор|колун|лом\b|гвоздод[её]р',
        'hand-saws'=>'ножовк|ручн.*пил|пила.*(?:450|500|зуб)',
        'hand-knives'=>'\bнож\b|ножи|ножниц|труборез|турборез|стеклорез',
        'hand-measuring'=>'рулетк|уровень|уровни|линейк|угольник|дальномер|штанген|шнур.*(?:размет|отбив)|правило.*(?:метр|алюм|[0-9])|метровк',
        'hand-trowels'=>'шпател|кельм|гладилк|т[её]рк|скребок|скребк|аппликатор',
        'hand-rollers'=>'валик|ролик.*(?:маляр|краск)|ручк.*(?:телескоп|валик)|телескоп.*ручк|кювет',
        'hand-brushes'=>'кисть|кисти|кисточк',
        'hand-clamps'=>'струбцин|зажим.*(?:быстр|столяр)',
        'hand-storage'=>'ящик.*инструмент|сумк.*инструмент|жилет.*инструмент|органайзер',
        'safety-gloves'=>'перчатк|краги',
        'safety-masks'=>'респиратор|маск.*защит|маска',
        'safety-eyes'=>'очки.*защит|наушник.*защит|беруш',
        'safety-clothes'=>'страховоч|пояс.*высот|спецодежд|наколенник',
        'garden-wheelbarrows'=>'тачк',
        'garden-tools'=>'лопат|грабл|секатор|сучкорез|мотыга|кетмен|тяпк',
        'garden-watering'=>'шланг|полив|распылител|коннектор.*сад',
        'household-tapes'=>'лент|скотч',
        'household-films'=>'пленк|плёнк|полог|тент',
        'household-ropes'=>'веревк|верёвк|шпагат|трос|леск|шнур',
        'household-cleaning'=>'метла|м[её]тл|веник|совок|щ[её]тк|сметк',
        'household-containers'=>'ведро|в[её]др|таз\b|мешок|мешк'
    ];
    foreach($rules as $id=>$pattern) if(preg_match('/'.$pattern.'/iu',$name)) return ['id'=>'shop-'.$id,'review'=>false];
    $sourceRules=[
        'plumbing-faucets'=>'смесители',
        'electrical-lighting'=>'светильники|/\s*лампы\s*/',
        'electrical-sockets'=>'/\s*(?:рамки|розетки)\s*/',
        'electrical-junction'=>'/\s*коробка\s*/',
        'electrical-breakers'=>'/\s*автоматы\s*/',
        'paint-paint'=>'водоэмульсионная краска|водаэмульсионная краска|/\s*2\.краски\s*/|^7\.краска',
        'hand-mixers'=>'/\s*1\.миксер',
        'household-drinks'=>'касса товары.*сок',
        'materials-floor'=>'напольный|плинтус',
        'materials-roof'=>'рубероид',
        'materials-profiles'=>'направляющ|профиль|маяки уголок',
        'materials-wood'=>'osb|фанера',
        'materials-waterproof'=>'мембрана|гидроиз',
        'materials-other'=>'крупногабарит|сетки',
        'chemicals-glue'=>'обойный клей',
        'chemicals-foam'=>'/\s*\d*\.?пены\s*/',
        'chemicals-cleaners'=>'универсальный akfix',
        'paint-varnish'=>'/\s*1\.лак\s*/',
        'paint-stain'=>'морилка',
        'paint-solvent'=>'растворитель',
        'paint-primers'=>'грунтовка|бетонконтакт',
        'hand-brushes'=>'кисточки', 'hand-rollers'=>'валики|кювет',
        'accessories-abrasives'=>'наждачка|шлифовальн',
        'hand-ladders'=>'стремянка',
        'fasteners-hardware'=>'/\s*\d*\.?крепеж\s*/',
        'household-office'=>'конс товор',
        'household-films'=>'картон|пленка защитная',
        'power-other'=>'электроинструмент',
        'hand-trowels'=>'малярный ручной',
        'materials-decor'=>'декор|шпон'
    ];
    foreach($sourceRules as $id=>$pattern)if(preg_match('~'.$pattern.'~iu',$sourcePath))return ['id'=>'shop-'.$id,'review'=>false];
    $fallback=[
        'materials-tile'=>'кафель|керамогранит','materials-decor'=>'декор|шпон',
        'paint-paint'=>'краск|водоэмульсион','materials-drymix'=>'сух.*смес|затирк',
        'plumbing-other'=>'сантех|водопровод','electrical-other'=>'электротовар',
        'hand-other'=>'ручной инструмент|измерительн','household-other'=>'хозяйствен'
    ];
    foreach($fallback as $id=>$pattern) if(preg_match('/'.$pattern.'/iu',$sourcePath)) return ['id'=>'shop-'.$id,'review'=>true];
    return ['id'=>'shop-other','review'=>true];
}
