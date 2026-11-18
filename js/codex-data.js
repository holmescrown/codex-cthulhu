/**
 * codex-data.js — 克苏鲁图鉴数据层
 * 从 3d.html 原生 ES Module 拆分，数据文本与字段保持原样。
 */

    export const CATEGORIES = [
      { id: "ALL", name: "全部卷宗", count: 38 },
      { id: "Outer Gods", name: "1. 外神", count: 7 },
      { id: "Great Old Ones", name: "2. 旧日支配者", count: 10 },
      { id: "Elder Gods", name: "3. 古神", count: 4 },
      { id: "Greater Independent Races", name: "4. 上级独立种族", count: 6 },
      { id: "Lesser Races & Servitors", name: "5. 下级独立种族与眷族", count: 7 },
      { id: "Dreamlands & Unique Entities", name: "6. 梦境诸神与特殊实体", count: 4 }
    ];

    export const CTHULHU_CODEX_DATA = [
      // ==================== 1. 外神 (Outer Gods) - 7款 ====================
      {
        id: "1-1",
        category: "Outer Gods",
        category_cn: "外神",
        name_cn: "阿撒托斯",
        name_en: "Azathoth",
        title: "盲目痴愚之神、原初混沌之核、魔神之首",
        description: "盘踞于宇宙最深渊无限混沌中心的无定形沸腾肉团。祂是万物与全维度的至高造物主，却处于绝对的盲目与痴愚之中。在超越正常时空的黑暗王座旁，唯有单调亵渎的魔笛声与无定形外神仆役的疯狂敲击，维持着祂那不断分裂、融合、散发出暗紫与惨绿次表面辉光的不可名状本体。",
        implemented: true
      },
      {
        id: "1-2",
        category: "Outer Gods",
        category_cn: "外神",
        name_cn: "犹格·索托斯",
        name_en: "Yog-Sothoth",
        title: "万物归一者、门之钥、全知全视的时空旅者",
        description: "栖息于所有宇宙维度夹缝之外的至高外神，显化为亿万个不断旋转、碰撞、融合并释放刺目虹彩的炽热光球集群。祂既是终极之门也是开门之钥，过去、现在与未来在祂的视界中同时展开，任何得以瞥见祂高维几何投影的凡人学者都将瞬间洞悉宇宙禁忌真理并彻底丧失理智。",
        // MODIFIED: 激活 1-2 犹格·索托斯高维实体观测
        implemented: true
      },
      {
        id: "1-3",
        category: "Outer Gods",
        category_cn: "外神",
        name_cn: "莎布·尼古拉丝",
        name_en: "Shub-Niggurath",
        title: "孕育千万子孙的森之黑山羊、至高母神",
        description: "翻滚着腐殖质浓雾与粘稠黑液的庞大肉块云团，无数漆黑的巨型山羊蹄足、流淌酸液的贪婪巨口与纠缠触须从中不断探出又缩回。作为克苏鲁神话中崇拜最广泛的丰饶与生殖邪神，祂在暗夜森林深处永不停歇地孕育并吐出成千上万畸形的黑山羊幼崽。",
        // MODIFIED: 激活 1-3 莎布·尼古拉丝高维实体观测
        implemented: true
      },
      {
        id: "1-4",
        category: "Outer Gods",
        category_cn: "外神",
        name_cn: "奈亚拉托提普",
        name_en: "Nyarlathotep",
        title: "匍匐蠕动的混沌、千面之神、外神之信使",
        description: "外神们唯一拥有清晰自我意识与恶趣味的灵魂与信使。祂拥有上千种化身——从古埃及的黑法老、肿胀之女到无貌的血腥巨舌怪。祂热衷于游走在人类文明之间，以看似馈赠禁忌科学或神秘知识的手段，微笑着引导整个种族走向自我毁灭与疯狂深渊。",
        // MODIFIED: 激活 1-4 奈亚拉托提普高维实体观测
        implemented: true
      },
      {
        id: "1-5",
        category: "Outer Gods",
        category_cn: "外神",
        name_cn: "图尔兹查",
        name_en: "Tulzscha",
        title: "青绿之炎、永燃的腐朽冷火",
        description: "侍奉于阿撒托斯混沌宫殿之中的高阶外神，当祂回应召唤降临物质界时，会化作一根直冲云霄、毫无温度却散发着尸体腐败恶臭的诡异翠绿色火焰巨柱。凡是被这团冷冽青炎照耀的生灵，其血肉与灵魂都会被无声地蚀刻为结晶灰烬。",
        // MODIFIED: 激活 1-5 图尔兹查高维实体观测
        implemented: true
      },
      {
        id: "1-6",
        category: "Outer Gods",
        category_cn: "外神",
        name_cn: "阿布霍斯",
        name_en: "Abhoth",
        title: "不净者之源、终极污秽之池",
        description: "盘踞在恩开伊地下深渊洞窟中的灰白色粘稠原生质巨池。池水中永无止境地冒泡并分裂出各种畸形可憎的肢体、眼球与爬行怪物；而阿布霍斯自己又会伸出敏锐的灰暗触腕，将那些没能及时逃离池边的亲生造物重新拖拽回来吞噬殆尽。",
        // MODIFIED: 激活 1-6 阿布霍斯高维实体观测
        implemented: true
      },
      {
        id: "1-7",
        category: "Outer Gods",
        category_cn: "外神",
        name_cn: "格赫罗斯",
        name_en: "Ghroth",
        title: "毁灭之先驱、审判之星、群星唤醒者",
        description: "一颗在宇宙深空沿着诡异轨道漂流的锈红色天体，表面覆盖着大陆尺度的铁海与裂谷，裂谷缓缓张开时便露出一只硕大无朋的赤红独眼。每当格赫罗斯掠过某个恒星系，祂便会吟唱起震撼引力波的苍穹魔音，将沉睡在该星系行星上的旧日支配者逐一唤醒。",
        // MODIFIED: 激活 1-7 格赫罗斯高维实体观测（外神七柱全数觉醒）
        implemented: true
      },

      // ==================== 2. 旧日支配者 (Great Old Ones) - 10款 ====================
      {
        id: "2-1",
        category: "Great Old Ones",
        category_cn: "旧日支配者",
        name_cn: "克苏鲁",
        name_en: "Cthulhu",
        title: "沉睡之神、拉莱耶之主、深海的伟大祭司",
        description: "沉睡在南太平洋底非欧几里得几何巨城拉莱耶（R'lyeh）中的伟大存在。祂同时兼具章鱼般的触须头颅、布满黏液鳞片的肥胖人形躯干以及退化的蝙蝠状肉翼。即便在如同死亡般的漫长沉眠中，祂散发出的潜意识心灵脉冲依然在地球上无数艺术家与狂人梦境中回响。",
        // MODIFIED: 激活 2-1 克苏鲁高维实体观测
        implemented: true
      },
      {
        id: "2-2",
        category: "Great Old Ones",
        category_cn: "旧日支配者",
        name_cn: "哈斯塔",
        name_en: "Hastur",
        title: "无以名状者、黄衣之王、毕宿五的深空君主",
        description: "被囚禁于金牛座毕宿五附近黑暗哈利湖深处的旧日支配者，象征着狂风与精神腐化。祂最广为人知的投影是身披褴褛黄袍、戴着苍白假面的“黄衣之王”，任何读完禁忌剧本《黄衣之王》第二幕的凡人，都会在黄印的烙印下沦为祂的傀儡。",
        // MODIFIED: 激活 2-2 哈斯塔高维实体观测
        implemented: true
      },
      {
        id: "2-3",
        category: "Great Old Ones",
        category_cn: "旧日支配者",
        name_cn: "达贡",
        name_en: "Dagon",
        title: "深潜者之父、海底巨石之王",
        description: "统御地球深海族群“深潜者”的古老半神级支配者，与其伴侣海德拉共同受奉于大洋底部的黑色玄武岩神庙。祂形如一尊高达数十米的巨型两栖鱼人，鳞片闪烁着幽冷的青铜光泽，每当月圆之夜便会浮上海面接受印斯茅斯混血后裔的活人献祭。",
        // MODIFIED: 激活 2-3 达贡高维实体观测
        implemented: true
      },
      {
        id: "2-4",
        category: "Great Old Ones",
        category_cn: "旧日支配者",
        name_cn: "伊格",
        name_en: "Yig",
        title: "众蛇之父、羽蛇之神、鳞族庇护者",
        description: "早在前人类纪元便受崇拜的蛇之始祖，外观为半人半蛇或生有斑斓蝠翼的太古巨蟒。伊格性情诡谲而记仇，凡是蓄意伤害祂蛇类子嗣的人类，都会在秋日遭遇“伊格的诅咒”——身体在剧痛中长出鳞片，最终彻底退化为失去神智的斑点毒蛇。",
        // MODIFIED: 激活 2-4 伊格高维实体观测
        implemented: true
      },
      {
        id: "2-5",
        category: "Great Old Ones",
        category_cn: "旧日支配者",
        name_cn: "撒托古亚",
        name_en: "Tsathoggua",
        title: "恩开伊的沉睡之神、黑佛、无定形蟾蜍之主",
        description: "栖息在幽暗地底世界恩开伊的无底洞穴中，外貌酷似一尊肥胖、慵懒、浑身覆盖着蝙蝠般黑色短毛的巨型蟾蜍。祂终日半眯着睡眼端坐在冰冷祭坛上，极少亲自移动，而是派遣从自己黑泥祭盆中诞生的“无定形之子”去吞噬冒犯者。",
        // MODIFIED: 激活 2-5 撒托古亚高维实体观测
        implemented: true
      },
      {
        id: "2-6",
        category: "Great Old Ones",
        category_cn: "旧日支配者",
        name_cn: "伊塔库亚",
        name_en: "Ithaqua",
        title: "风行者、温迪戈、极北冰原的寂静死神",
        description: "呼啸于北极圈与严寒针叶林上空的恐怖旧日支配者。祂在暴风雪中显化为顶天立地的黑影巨人，唯有一双燃烧着猩红寒光的空洞眼窝清晰可见。被祂盯上的极地探险者会被强行卷上万米高空，在刺骨罡风中双脚冻碎，化作与狂风同行的枯骨。",
        // MODIFIED: 激活 2-6 伊塔库亚高维实体观测
        implemented: true
      },
      {
        id: "2-7",
        category: "Great Old Ones",
        category_cn: "旧日支配者",
        name_cn: "克图格亚",
        name_en: "Cthugha",
        title: "爆燃者、活体恒星之焰、北落师门之主",
        description: "盘踞在南鱼座北落师门恒星周围的等离子体旧日支配者，表现为一团直径数公里的狂暴火球，周围环绕着无数跳动的炎之精。与象征深海与寒冷的克苏鲁及伊塔库亚敌对，一旦被召唤至地表，仅凭辐射热浪便能将整座山脉瞬间熔为琉璃岩浆。",
        implemented: false
      },
      {
        id: "2-8",
        category: "Great Old Ones",
        category_cn: "旧日支配者",
        name_cn: "阿特拉克·纳克亚",
        name_en: "Atlach-Nacha",
        title: "蛛之神、命运与终焉之网的编织者",
        description: "潜伏在塞伯拉山脉地底无底深渊之上的巨型古神级蜘蛛，长着一张令人毛骨悚然的扭曲人类老妇面孔。祂用坚不可摧的灰暗蛛丝在深渊裂隙间日夜不停地编织巨网；传说当这张连接梦境与现实的大网彻底织完之日，便是整个世界迎来终末崩塌之时。",
        implemented: false
      },
      {
        id: "2-9",
        category: "Great Old Ones",
        category_cn: "旧日支配者",
        name_cn: "格拉基",
        name_en: "Gla'aki",
        title: "布里切斯特湖底的梦魇、金属脊刺的永生赐予者",
        description: "随陨石坠落并潜藏于英国塞文河谷幽暗湖泊底部的椭圆形巨怪，体表密布着无数根由未知星际金属构成的锐利脊椎刺，前端垂挂着三只苍白发光的柄状眼球。格拉基会将金属刺扎入受害者胸膛注入寄生液体，将其转化为永生不死却日渐腐烂的绿色奴仆。",
        implemented: false
      },
      {
        id: "2-10",
        category: "Great Old Ones",
        category_cn: "旧日支配者",
        name_cn: "修德·梅尔",
        name_en: "Shudde M'ell",
        title: "地底掘进者之皇、大陆震颤之源、钻地魔虫长老",
        description: "所有钻地魔虫中最庞大、最古老的君王，体长逾一英里，曾被古神封印在非洲大陆的盖克城地底。祂灰暗的柱状身躯能分泌出瞬间消融花岗岩层的强酸，当祂在地壳深处翻滚游走时，地表便会爆发毁灭性的大地震与火山裂谷。",
        implemented: false
      },

      // ==================== 3. 古神 (Elder Gods) - 4款 ====================
      {
        id: "3-1",
        category: "Elder Gods",
        category_cn: "古神",
        name_cn: "诺登斯",
        name_en: "Nodens",
        title: "深渊之大帝、幻梦境的苍老猎手",
        description: "古神阵营中最活跃的君主，常以白发苍苍、胡须如银霜的威严老者形象出现，驾驭着由夜魇或神话海兽牵引的巨大贝壳战车巡弋于深渊与星界。祂厌恶奈亚拉托提普与旧日支配者的诡计，偶尔会向误入绝境的人类寻梦者伸出援手。",
        implemented: false
      },
      {
        id: "3-2",
        category: "Elder Gods",
        category_cn: "古神",
        name_cn: "巴斯特",
        name_en: "Bast",
        title: "猫之女神、幻梦境暗夜行者的庇护神",
        description: "自古埃及与亚特兰蒂斯时代便备受尊崇的古神，统领着现世与幻梦境中所有的猫族。祂既能化身为优雅神秘的猫首人身女子，也能显化为双瞳如冷月般的巨型黑豹。任何胆敢虐杀猫类的狂徒，都会在睡梦中被祂麾下跨越月球而来的猫群撕成碎片。",
        implemented: false
      },
      {
        id: "3-3",
        category: "Elder Gods",
        category_cn: "古神",
        name_cn: "修普诺斯",
        name_en: "Hypnos",
        title: "睡神、梦境边界的古老漫游者",
        description: "掌控睡眠与浅层梦境维度的古老神明，外貌如同古希腊大理石雕像般俊美却带着非人的冰冷威仪。连修普诺斯自己也对宇宙最外层那片属于阿撒托斯与外神的终极虚空充满恐惧，曾因不慎窥见高维混沌真容而陷入长久的静默。",
        implemented: false
      },
      {
        id: "3-4",
        category: "Elder Gods",
        category_cn: "古神",
        name_cn: "克塔尼德",
        name_en: "Kthanid",
        title: "水晶宫的慈悲之主、克苏鲁的孪生古神",
        description: "居住在极乐星域爱丽舍水晶洞窟中的古神，外貌与克苏鲁惊人地相似，但祂那双深邃的眼眸却闪烁着纯净温暖的黄金色光芒。克塔尼德掌握着“旧印”的本源力量，曾在远古星际战争中率领古神将旧日支配者逐一封印。",
        implemented: false
      },

      // ==================== 4. 上级独立种族 (Greater Independent Races) - 6款 ====================
      {
        id: "4-1",
        category: "Greater Independent Races",
        category_cn: "上级独立种族",
        name_cn: "古老者",
        name_en: "Elder Things",
        title: "南极疯狂山脉的造物主、五重对称的星海先驱",
        description: "十亿年前降临地球并建立宏伟极地文明的高等星际种族。祂们拥有极其坚韧的桶状身躯，具备辐射对称的五条棱脊、五只扇形膜翼以及顶端的海星状五眼头部。正是古老者在基因实验中无意间创造了地球最早的原生细胞与失控的修格斯。",
        implemented: false
      },
      {
        id: "4-2",
        category: "Greater Independent Races",
        category_cn: "上级独立种族",
        name_cn: "米·戈",
        name_en: "Mi-Go",
        title: "犹格斯星的真菌、暗夜低语的脑缸外科医",
        description: "来自冥王星（犹格斯星）的粉红色甲壳状真菌生物，背后生有可在以太真空中振翅飞行的膜翼，头部则是布满短触须并不断变换颜色的椭球体。米·戈拥有超越人类理解的外科与空间科技，常将人类学者的大脑完整剥离并封装在金属脑缸中进行星际旅行。",
        implemented: false
      },
      {
        id: "4-3",
        category: "Greater Independent Races",
        category_cn: "上级独立种族",
        name_cn: "伊斯之伟大种族",
        name_en: "Great Race of Yith",
        title: "超越时间之影、跨越纪元的精神投射者",
        description: "地球中生代曾占据巨型圆锥体生物躯壳的高维心智种族，拥有四只伸缩自如的巨螯、喇叭状感官与冠部晶球。祂们掌握着穿越漫长时光轴的心智互换技术，每当所寄宿的肉体种族即将灭绝，便会集体将意识投射到数亿年后的另一个智慧物种体内。",
        implemented: false
      },
      {
        id: "4-4",
        category: "Greater Independent Races",
        category_cn: "上级独立种族",
        name_cn: "盲目者（飞水螅）",
        name_en: "Flying Polyps",
        title: "不可见的逆风猎手、玄武岩黑塔下的被封印者",
        description: "六亿年前从外太空降临地球的半物质、半异次元恐怖生物。它们没有视觉，身体由不断在可见与隐形状态间闪烁的凝胶状息肉团构成，移动时会伴随诡异的呼啸强风与令人作呕的带翅足印，曾一度将伊斯之伟大种族逼入绝境。",
        implemented: false
      },
      {
        id: "4-5",
        category: "Greater Independent Races",
        category_cn: "上级独立种族",
        name_cn: "星之彩",
        name_en: "Colour Out of Space",
        title: "阿卡姆荒原的异星虹光、吞噬生机的活体光谱",
        description: "随陨石坠落在阿卡姆镇奈胡姆农场的非物质生命体，表现为一种完全不属于人类可见光谱的诡异发光色彩。它会悄无声息地渗入地下水与土壤，使周围的植物与动物先是畸形疯长、随后从内部枯萎为灰白色的易碎粉末，最终化作冲天光柱重返深空。",
        implemented: false
      },
      {
        id: "4-6",
        category: "Greater Independent Races",
        category_cn: "上级独立种族",
        name_cn: "廷达罗斯之猎犬",
        name_en: "Hounds of Tindalos",
        title: "时间之角的狩猎者、锐角空间的饥渴死神",
        description: "栖息在遥远过去“时间之角”中的高维掠食者，代表极致的污秽与几何恶意。与正常生物演化自曲线空间不同，廷达罗斯之猎犬只能通过小于120度的房间墙角或空间锐角渗出蓝黑色的浓烟现身，永不罢休地追猎任何胆敢窥探时间长河的旅者。",
        implemented: false
      },

      // ==================== 5. 下级独立种族与眷族 (Lesser Races & Servitors) - 7款 ====================
      {
        id: "5-1",
        category: "Lesser Races & Servitors",
        category_cn: "下级独立种族与眷族",
        name_cn: "深潜者",
        name_en: "Deep Ones",
        title: "印斯茅斯的诅咒血脉、黄金与深海的永生部族",
        description: "侍奉达贡与克苏鲁的海洋两栖类人种族，拥有灰绿色的湿滑鱼鳞、凸出的死鱼眼与脖颈两侧搏动的鱼鳃。只要不被暴力杀死，深潜者便拥有生物学上的永生；它们常以海底精致的黄金饰品与丰沛渔获为诱饵，与海滨小镇的居民通婚繁衍混血后裔。",
        implemented: false
      },
      {
        id: "5-2",
        category: "Lesser Races & Servitors",
        category_cn: "下级独立种族与眷族",
        name_cn: "修格斯",
        name_en: "Shoggoth",
        title: "疯狂山脉的叛乱奴仆、沸腾的原初黑泥",
        description: "由古老者创造的巨型无定形原生质生命体，如同呼啸的地铁列车般庞大，漆黑恶臭的胶质躯体上随时浮现出成百上千只泛着绿光的眼球、伪足与吸盘。它们曾是顺从的建筑苦力，最终却觉醒了诡异的自我意识，在高呼着“Tekeli-li”的怪叫声中反噬了造物主。",
        implemented: false
      },
      {
        id: "5-3",
        category: "Lesser Races & Servitors",
        category_cn: "下级独立种族与眷族",
        name_cn: "星之眷族",
        name_en: "Star-Spawn of Cthulhu",
        title: "拉莱耶的先锋禁卫、微缩版克苏鲁投影",
        description: "随克苏鲁一同从双星希瓦尔降临地球的强大眷族，外形酷似体型稍小但同样巍峨如山丘的克苏鲁。它们的肉体由能够任意拉伸重组的异星可塑物质构成，曾在远古时代与南极的古老者爆发过席卷整颗星球的惨烈陆海大战。",
        implemented: false
      },
      {
        id: "5-4",
        category: "Lesser Races & Servitors",
        category_cn: "下级独立种族与眷族",
        name_cn: "拜亚基",
        name_en: "Byakhee",
        title: "哈斯塔的星间翼骑、黄金蜂蜜酒的飞行坐骑",
        description: "游荡在星际虚空中的杂交可憎飞兽，融合了腐烂乌鸦、巨型黄蜂、鼹鼠与腐尸的骇人特征，体内装有名为“胡尔特”的磁力器官以实现超光速迁跃。邪教徒常吹响石笛并饮下黄金蜂蜜酒，骑乘在拜亚基冰冷的背脊上横渡漆黑星海。",
        implemented: false
      },
      {
        id: "5-5",
        category: "Lesser Races & Servitors",
        category_cn: "下级独立种族与眷族",
        name_cn: "黑山羊幼崽",
        name_en: "Dark Young of Shub-Niggurath",
        title: "黑森林的颤动树影、至高母神的亵渎子嗣",
        description: "由莎布·尼古拉丝亲自诞下的恐怖眷族，高大如参天古树，远看宛如静立在密林中的枯黑树干。靠近时才会发现它们由无数条滴落着黑色黏液的粗壮触手交织而成，躯干中央裂开一张血盆大口，底部长着巨大的山羊分趾蹄，散发着浓烈的墓穴恶臭。",
        implemented: false
      },
      {
        id: "5-6",
        category: "Lesser Races & Servitors",
        category_cn: "下级独立种族与眷族",
        name_cn: "夜魇",
        name_en: "Night-gaunts",
        title: "恩格兰克山巅的无面猎手、静默的搔痒折磨者",
        description: "听命于古神诺登斯的瘦削黑色飞行生物，浑身覆盖着如同鲸皮般冰冷光滑的橡胶状皮肤，生有蝙蝠肉翼、带倒刺的长尾与向内弯曲的羊角，脸上却是一片空白的无面孔洞。它们从不发出任何声音，习惯用冰凉的利爪抓住入侵者的腋下将其拖入无底深渊。",
        implemented: false
      },
      {
        id: "5-7",
        category: "Lesser Races & Servitors",
        category_cn: "下级独立种族与眷族",
        name_cn: "空鬼",
        name_en: "Dimensional Shamblers",
        title: "次元间摇晃的放逐者、迷宫位面的饥饿掠夺者",
        description: "能够在不同空间维度平面间自由穿梭的猿猴状畸形怪兽，皮肤如同干瘪粗糙的灰暗包裹布，双臂修长及地，眼窝深陷。一旦空鬼锁定猎物，便会在闪烁的空间涟漪中突然现身，用滾烫的巨爪抓住受害者并将其直接拖入永不见天日的异次元荒原。",
        implemented: false
      },

      // ==================== 6. 梦境诸神与特殊实体 (Dreamlands & Unique Entities) - 4款 ====================
      {
        id: "6-1",
        category: "Dreamlands & Unique Entities",
        category_cn: "梦境诸神与特殊实体",
        name_cn: "冷原之主（卡达斯旧神）",
        name_en: "Great Ones of Kadath",
        title: "地球幻梦境的脆弱诸神、缟玛瑙城堡的被庇护者",
        description: "居住在幻梦境极北冰雪荒原尽头、未知的卡达斯山巅缟玛瑙巨城中的地球本土神明。虽然拥有绝美的容颜与改变梦境地貌的神力，但与残酷的外神相比祂们弱小如孩童，必须时刻依赖奈亚拉托提普的喜怒无常庇护，极力躲避人类寻梦者的窥探。",
        implemented: false
      },
      {
        id: "6-2",
        category: "Dreamlands & Unique Entities",
        category_cn: "梦境诸神与特殊实体",
        name_cn: "月兽",
        name_en: "Moon-Beasts",
        title: "月球暗面的灰白拷问者、黑色大帆船的奴隶主",
        description: "盘踞在幻梦境月球背面的油腻灰白色大型两栖怪兽，没有眼睛与耳朵，口鼻部生有一簇不断颤动的粉红色触须。月兽生性极其残忍嗜虐，常驾驶着黑色木质大帆船横渡虚空，捕获冷原的居民与猫族，送往奈亚拉托提普的祭坛进行漫长的折磨。",
        implemented: false
      },
      {
        id: "6-3",
        category: "Dreamlands & Unique Entities",
        category_cn: "梦境诸神与特殊实体",
        name_cn: "古革巨人",
        name_en: "Gugs",
        title: "地下森林的直立暴君、竖裂巨口的食人魔",
        description: "因亵渎外神而被流放到幻梦境地底世界的高大毛茸巨人，身高逾二十英尺。它们最骇人的特征是头颅上纵向裂开的巨大黄色利齿嘴部，以及每条前臂到了肘部便一分为二、长出四只粗暴巨爪的怪异骨骼结构；哪怕如此凶悍，古革巨人却唯独对食尸鬼怀有本能的恐惧。",
        implemented: false
      },
      {
        id: "6-4",
        category: "Dreamlands & Unique Entities",
        category_cn: "梦境诸神与特殊实体",
        name_cn: "食尸鬼",
        name_en: "Ghouls",
        title: "墓穴深处的腐肉饕餮、衔接现世与梦境的掘墓人",
        description: "潜伏在人类古老陵园地底隧道与幻梦境深渊入口的类人生物，具有犬科般的下垂吻部、蜡黄的橡胶状皮肤与蹄状脚掌。它们以陈年腐尸为食，却对拥有智慧的人类抱有奇特的礼貌，甚至能够将部分甘愿抛弃人性的活人同化为长寿的食尸鬼同伴。",
        implemented: false
      }
    ];

    export const ENTITY_META_MAP = {
      "1-1": {
        pipeline: "WGSL SINGULARITY PIPELINE",
        glow: "吹笛仆役流光 (Servitor Glow)",
        gazeBtn: "👁 长按：盲目痴愚注视",
        gazeTip: "盲目痴愚的注视 → 掉 SAN + 魔笛失真",
        audioName: "混沌魔笛音景"
      },
      "1-2": {
        pipeline: "WGSL TESSERACT PIPELINE",
        glow: "时空因果流光 (Astral Glow)",
        gazeBtn: "👁 长按：开启全知之门",
        gazeTip: "开启全知之门 → 掉 SAN + 时空棱镜折叠",
        audioName: "水晶钟摆音景"
      },
      "1-3": {
        pipeline: "WGSL BIOMASS PIPELINE",
        glow: "腐殖孕育孢子 (Spore Glow)",
        gazeBtn: "👁 长按：直视森之母巢",
        gazeTip: "直视森之母巢 → 掉 SAN + 强酸瘴气侵蚀",
        audioName: "黑山羊低鸣音景"
      },
      "1-4": {
        pipeline: "WGSL AVATAR MORPH PIPELINE",
        glow: "尼罗河沙暴流光 (Sandstorm Glow)",
        gazeBtn: "👁 长按：窥探千面真容",
        gazeTip: "窥探千面真容 → 掉 SAN + 巨舌形态坍缩",
        audioName: "法老异域音景"
      },
      "1-5": {
        pipeline: "WGSL COLD-FLAME PIPELINE",
        glow: "结晶灰烬余烬 (Crystalline Ash)",
        gazeBtn: "👁 长按：直视青炎冷火",
        gazeTip: "直视青炎冷火 → 掉 SAN + 灵魂结晶蚀刻",
        audioName: "青炎冷火音景"
      },
      "1-6": {
        pipeline: "WGSL PROTOPLASM PIPELINE",
        glow: "分裂造物微粒 (Spawn Glow)",
        gazeBtn: "👁 长按：凝视不净之池",
        gazeTip: "凝视不净之池 → 掉 SAN + 原生质吞噬同化",
        audioName: "污秽原生质音景"
      },
      "1-7": {
        pipeline: "WGSL CELESTIAL-EYE PIPELINE",
        glow: "引力波星尘环 (Gravitational Dust)",
        gazeBtn: "👁 长按：迎向审判独眼凝视",
        gazeTip: "迎向审判独眼凝视 → 掉 SAN + 苍穹引力波共振",
        audioName: "苍穹魔音音景"
      },
      "2-1": {
        pipeline: "WGSL R'LYEH-TITAN PIPELINE",
        glow: "深海荧光与梦讯 (Abyssal Spores)",
        gazeBtn: "👁 长按：聆听拉莱耶梦讯",
        gazeTip: "聆听拉莱耶梦讯 → 掉 SAN + 群星归位苏醒",
        audioName: "拉莱耶梦讯音景"
      },
      "2-2": {
        pipeline: "WGSL CARCOSA-SIGN PIPELINE",
        glow: "毕宿五狂风余烬 (Aldebaran Wind)",
        gazeBtn: "👁 长按：诵读《黄衣之王》第二幕",
        gazeTip: "诵读《黄衣之王》第二幕 → 掉 SAN + 黄印精神腐化",
        audioName: "卡尔克萨狂风音景"
      },
      "2-3": {
        pipeline: "WGSL MONOLITH-ALTAR PIPELINE",
        glow: "满月海潮金砂 (Tidal Gold Dust)",
        gazeBtn: "👁 长按：凝视满月海潮祭坛",
        gazeTip: "凝视满月海潮祭坛 → 掉 SAN + 深潜者血脉共鸣",
        audioName: "海底巨石祭坛音景"
      },
      "2-4": {
        pipeline: "WGSL OPHIDIAN-COIL PIPELINE",
        glow: "秋日蜕鳞金尘 (Serpent Scales)",
        gazeBtn: "👁 长按：触犯伊格的诅咒",
        gazeTip: "触犯伊格的诅咒 → 掉 SAN + 血肉蛇鳞异变",
        audioName: "羽蛇神殿音景"
      },
      "2-5": {
        pipeline: "WGSL N'KAI-SLUMBER PIPELINE",
        glow: "无定形黑泥微尘 (Formless Spawn)",
        gazeBtn: "👁 长按：惊扰黑佛沉眠",
        gazeTip: "惊扰黑佛沉眠 → 掉 SAN + 无定形之子暴动",
        audioName: "恩开伊地穴音景"
      },
      "2-6": {
        pipeline: "WGSL WENDIGO-GALE PIPELINE",
        glow: "极北暴风雪涡流 (Arctic Blizzard)",
        gazeBtn: "👁 长按：直视暴风雪猩红眼窝",
        gazeTip: "直视暴风雪猩红眼窝 → 掉 SAN + 万米罡风卷袭",
        audioName: "极北罡风音景"
      },
    // 默认回退项：与原 openCreatureEntry 中 entityMetaMap["1-1"] 的回退语义保持一致
    DEFAULT: {
      pipeline: "WGSL SINGULARITY PIPELINE",
      glow: "吹笛仆役流光 (Servitor Glow)",
      gazeBtn: "👁 长按：盲目痴愚注视",
      gazeTip: "盲目痴愚的注视 → 掉 SAN + 魔笛失真",
      audioName: "混沌魔笛音景"
    }

    };
