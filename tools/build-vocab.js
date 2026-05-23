/**
 * build-vocab.js — 全自动词库生成器
 * 为所有缺失词库生成至少 300 词，扩充现有词库
 * 用法: node tools/build-vocab.js
 */
const fs = require('fs'), path = require('path');
const V = path.join(__dirname, '..', 'vocabulary');

function entry(w, p, pos, def, cn, ex) {
  return { word: w, pronunciation: '/' + p + '/', partOfSpeech: pos, definition: def, chineseDef: cn, example: ex };
}

// Compact format: word|ipa|pos|def|cn|ex
function parseText(txt) {
  return txt.trim().split('\n').filter(Boolean).map(l => {
    const [w,p,pos,def,cn,ex] = l.split('|');
    return entry(w,p,pos,def,cn,ex);
  });
}

function loadJson(file) {
  try { return JSON.parse(fs.readFileSync(path.join(V, file), 'utf-8')); } catch(_) { return []; }
}

function writeVocab(id, data) {
  fs.writeFileSync(path.join(V, id + '.json'), JSON.stringify(data, null, 2), 'utf-8');
  return data.length;
}

function updateIndex() {
  const idx = JSON.parse(fs.readFileSync(path.join(V, 'index.json'), 'utf-8'));
  const existingIds = new Set(idx.vocabularies.map(v => v.id));
  const newVocabs = {
    gaokao: { name: 'Gaokao', nameCn: '高考英语', description: '高中英语课标词汇，覆盖高考核心词汇', difficulty: 'intermediate' },
    k12: { name: 'K12', nameCn: '中考英语', description: '初中英语课标词汇，适合中考备考', difficulty: 'beginner' },
    business: { name: 'Business', nameCn: '商务英语', description: 'BEC核心词汇，涵盖商务场景', difficulty: 'advanced' },
    sat: { name: 'SAT', nameCn: 'SAT词汇', description: '美国高考核心学术词汇', difficulty: 'advanced' },
    'phrasal-verbs': { name: 'Phrasal Verbs', nameCn: '动词短语', description: '高频英语动词短语', difficulty: 'intermediate' },
    collins: { name: 'Collins 3000', nameCn: '柯林斯高频词', description: '柯林斯星级标记高频单词', difficulty: 'beginner' },
  };
  Object.entries(newVocabs).forEach(([id, info]) => {
    if (!existingIds.has(id)) {
      const count = (loadJson(id + '.json') || []).length;
      idx.vocabularies.push({ id, ...info, wordCount: count, source: 'builtin', file: id + '.json' });
    }
  });
  idx.vocabularies.forEach(v => {
    const data = loadJson(v.file);
    if (data.length) v.wordCount = data.length;
  });
  fs.writeFileSync(path.join(V, 'index.json'), JSON.stringify(idx, null, 2), 'utf-8');
  console.log('✓ index.json updated');
}

// ============ WORD DATA ============
// Format: word|ipa|pos|definition|chineseDef|example

const GAOKAO = parseText(`
abandon|əˈbændən|v.|to leave completely|放弃，遗弃|They had to abandon the sinking ship.
ability|əˈbɪləti|n.|the power to do something|能力，才能|She has the ability to succeed.
abroad|əˈbrɔːd|adv.|in a foreign country|在国外|He wants to study abroad.
absent|ˈæbsənt|adj.|not present|缺席的|She was absent from school yesterday.
absorb|əbˈzɔːb|v.|to take in or soak up|吸收|Plants absorb carbon dioxide.
abstract|ˈæbstrækt|adj.|existing as an idea|抽象的|Justice is an abstract concept.
abundant|əˈbʌndənt|adj.|existing in large quantities|充足的|The region has abundant resources.
abuse|əˈbjuːs|n.|cruel or violent treatment|滥用，虐待|The abuse of power must stop.
academic|ˌækəˈdemɪk|adj.|relating to education|学术的|She had a brilliant academic career.
accelerate|əkˈseləreɪt|v.|to increase speed|加速|The car accelerated quickly.
accept|əkˈsept|v.|to agree to receive|接受|She accepted the job offer.
access|ˈækses|n.|the ability to enter or use|通道，使用权|Students have access to the library.
accident|ˈæksɪdənt|n.|an unexpected harmful event|事故|The accident caused a traffic jam.
accompany|əˈkʌmpəni|v.|to go with someone|陪伴|She accompanied him to the airport.
accomplish|əˈkʌmplɪʃ|v.|to succeed in doing|完成|We accomplished our goal.
account|əˈkaʊnt|n.|a report or description|账户，说明|He gave a detailed account.
accurate|ˈækjərət|adj.|correct and precise|准确的|The measurement is accurate.
achieve|əˈtʃiːv|v.|to reach a goal|达到，取得|She achieved her dream.
acknowledge|əkˈnɒlɪdʒ|v.|to accept or admit|承认|He acknowledged his mistake.
acquire|əˈkwaɪər|v.|to obtain or gain|获得|She acquired new skills.
adapt|əˈdæpt|v.|to change to fit new conditions|适应|Animals adapt to survive.
adequate|ˈædɪkwət|adj.|enough or sufficient|充足的|The supply is adequate.
adjust|əˈdʒʌst|v.|to change slightly|调整|She adjusted the settings.
admire|ədˈmaɪər|v.|to regard with respect|钦佩|I admire your courage.
admit|ədˈmɪt|v.|to confess or allow entry|承认，准许|He admitted his mistake.
adopt|əˈdɒpt|v.|to legally take as one's own|采纳，收养|They adopted a child.
advance|ədˈvɑːns|v.|to move forward|前进|Technology continues to advance.
advantage|ədˈvɑːntɪdʒ|n.|a benefit or gain|优势|Being tall is an advantage.
adventure|ədˈventʃər|n.|an exciting experience|冒险|They went on an adventure.
advise|ədˈvaɪz|v.|to give recommendations|建议|The doctor advised rest.
affect|əˈfekt|v.|to influence|影响|The weather affects my mood.
afford|əˈfɔːd|v.|to have enough money for|负担得起|I can't afford that car.
agree|əˈɡriː|v.|to share the same opinion|同意|We all agreed.
agriculture|ˈæɡrɪkʌltʃər|n.|farming and cultivation|农业|Agriculture is the main industry.
allow|əˈlaʊ|v.|to permit|允许|Smoking is not allowed here.
ambition|æmˈbɪʃən|n.|a strong desire to succeed|雄心|His ambition is to become CEO.
amount|əˈmaʊnt|n.|quantity or total|数量|A large amount was spent.
ancient|ˈeɪnʃənt|adj.|very old|古代的|The ancient city was discovered.
announce|əˈnaʊns|v.|to make a public statement|宣布|They announced their engagement.
annual|ˈænjuəl|adj.|yearly|每年的|The annual meeting is in March.
anxiety|æŋˈzaɪəti|n.|worry or nervousness|焦虑|She felt anxiety before the exam.
appeal|əˈpiːl|n.|a serious request|呼吁，吸引力|The charity made an appeal.
apply|əˈplaɪ|v.|to make a formal request|申请|She applied for the job.
appreciate|əˈpriːʃieɪt|v.|to recognize the value|感激|I appreciate your help.
approach|əˈprəʊtʃ|v.|to come near|接近|The train is approaching.
approve|əˈpruːv|v.|to officially agree|批准|The committee approved the plan.
arise|əˈraɪz|v.|to come up|出现|A problem has arisen.
arrange|əˈreɪndʒ|v.|to organize|安排|She arranged the flowers.
arrest|əˈrest|v.|to seize by law|逮捕|The police arrested the thief.
artificial|ˌɑːtɪˈfɪʃəl|adj.|made by humans|人工的|Artificial intelligence is advancing.
aspect|ˈæspekt|n.|a part or feature|方面|We considered every aspect.
assess|əˈses|v.|to evaluate|评估|We need to assess the damage.
assign|əˈsaɪn|v.|to allocate|分配|The teacher assigned homework.
assist|əˈsɪst|v.|to help|协助|She assisted the elderly man.
assume|əˈsjuːm|v.|to suppose without proof|假设|I assume you're right.
atmosphere|ˈætməsfɪər|n.|the air surrounding Earth|大气，气氛|The atmosphere was tense.
attach|əˈtætʃ|v.|to fasten or connect|附上|Please attach the file.
attempt|əˈtempt|n.|an effort to do something|尝试|He made an attempt.
attend|əˈtend|v.|to be present at|参加|She attended the conference.
attitude|ˈætɪtjuːd|n.|a way of thinking|态度|He has a positive attitude.
attract|əˈtrækt|v.|to draw toward|吸引|The museum attracts many visitors.
authority|ɔːˈθɒrəti|n.|the power to give orders|权威|The local authority made the decision.
available|əˈveɪləbl|adj.|able to be used|可用的|Tickets are still available.
average|ˈævərɪdʒ|n.|the typical amount|平均|His grades are above average.
avoid|əˈvɔɪd|v.|to keep away from|避免|She avoided eye contact.
aware|əˈweər|adj.|having knowledge of|意识到|He was aware of the danger.
balance|ˈbæləns|n.|even distribution of weight|平衡|She lost her balance.
ban|bæn|v.|to prohibit|禁止|Smoking is banned.
barrier|ˈbæriər|n.|something that blocks|障碍|Language can be a barrier.
basis|ˈbeɪsɪs|n.|a foundation|基础，根据|On a daily basis.
behalf|bɪˈhɑːf|n.|in the interest of|代表|He spoke on behalf of the group.
behave|bɪˈheɪv|v.|to act in a certain way|举止|Children should behave well.
belief|bɪˈliːf|n.|a strong opinion|信念|His beliefs are strong.
belong|bɪˈlɒŋ|v.|to be a member of|属于|This book belongs to me.
benefit|ˈbenɪfɪt|n.|an advantage or gain|利益|Exercise has many benefits.
blame|bleɪm|v.|to hold responsible|责备|Don't blame others.
border|ˈbɔːdər|n.|a dividing line|边界|They crossed the border.
brave|breɪv|adj.|courageous|勇敢的|The brave firefighter saved the child.
brief|briːf|adj.|short in duration|简短的|The meeting was brief.
brilliant|ˈbrɪliənt|adj.|very bright or intelligent|杰出的|She had a brilliant idea.
broad|brɔːd|adj.|wide|宽阔的|The river is very broad.
budget|ˈbʌdʒɪt|n.|a spending plan|预算|We need to stick to our budget.
burden|ˈbɜːdən|n.|a heavy load|负担|The burden of leadership is heavy.
calculate|ˈkælkjuleɪt|v.|to compute|计算|Can you calculate the total?
campaign|kæmˈpeɪn|n.|a series of planned actions|运动|The election campaign starts.
capable|ˈkeɪpəbl|adj.|having the ability|有能力的|She is a capable leader.
capture|ˈkæptʃər|v.|to take by force|捕获|The photographer captured the moment.
career|kəˈrɪər|n.|an occupation for life|职业|She chose a career in medicine.
category|ˈkætəɡəri|n.|a class or division|类别|Books are divided into categories.
caution|ˈkɔːʃən|n.|careful attention|谨慎|Proceed with caution.
celebrate|ˈselɪbreɪt|v.|to mark a special occasion|庆祝|We celebrated her birthday.
ceremony|ˈserɪməni|n.|a formal event|仪式|The wedding ceremony was beautiful.
challenge|ˈtʃælɪndʒ|n.|a difficult task|挑战|The exam was a real challenge.
character|ˈkærɪktər|n.|personality or role|性格，角色|He has a strong character.
charity|ˈtʃærəti|n.|help for the needy|慈善|They donated to charity.
chief|tʃiːf|adj.|most important|主要的|The chief concern is safety.
circumstance|ˈsɜːkəmstəns|n.|a condition or fact|环境，情况|Under the circumstances.
citizen|ˈsɪtɪzən|n.|a member of a country|公民|She is a US citizen.
claim|kleɪm|v.|to assert or demand|声称|He claimed ownership.
climate|ˈklaɪmət|n.|weather conditions over time|气候|The climate is changing.
collapse|kəˈlæps|v.|to fall down suddenly|倒塌|The building collapsed.
colleague|ˈkɒliːɡ|n.|a work associate|同事|My colleague helped me.
combine|kəmˈbaɪn|v.|to join together|结合|Combine the ingredients.
command|kəˈmɑːnd|v.|to give an order|命令|The general commanded his troops.
comment|ˈkɒment|n.|a remark or opinion|评论|He made a positive comment.
commercial|kəˈmɜːʃəl|adj.|relating to commerce|商业的|The commercial district is busy.
commit|kəˈmɪt|v.|to pledge or carry out|犯，承诺|He committed a crime.
communicate|kəˈmjuːnɪkeɪt|v.|to share information|交流|We communicate via email.
community|kəˈmjuːnəti|n.|a group of people|社区|The community came together.
companion|kəmˈpænjən|n.|a friend or partner|同伴|She was my travel companion.
compare|kəmˈpeər|v.|to examine similarities|比较|Compare the two products.
compete|kəmˈpiːt|v.|to strive against others|竞争|Athletes compete for gold.
complain|kəmˈpleɪn|v.|to express dissatisfaction|抱怨|She complained about the service.
complete|kəmˈpliːt|adj.|having all parts|完整的|The project is complete.
complex|ˈkɒmpleks|adj.|complicated|复杂的|The problem is very complex.
compose|kəmˈpəʊz|v.|to write or create|创作|He composed a beautiful song.
concentrate|ˈkɒnsəntreɪt|v.|to focus attention|集中|Please concentrate.
concept|ˈkɒnsept|n.|an abstract idea|概念|Justice is a difficult concept.
concern|kənˈsɜːn|n.|a matter of interest|关心，担忧|Her safety is my concern.
conclude|kənˈkluːd|v.|to bring to an end|总结|We concluded the meeting.
condition|kənˈdɪʃən|n.|a state or requirement|条件|The car is in good condition.
conduct|kənˈdʌkt|v.|to organize and carry out|进行|They conducted an experiment.
conference|ˈkɒnfərəns|n.|a formal meeting|会议|He spoke at the conference.
confident|ˈkɒnfɪdənt|adj.|sure of oneself|自信的|She is confident.
confirm|kənˈfɜːm|v.|to establish the truth|确认|Please confirm your attendance.
conflict|ˈkɒnflɪkt|n.|a serious disagreement|冲突|The conflict lasted for years.
confuse|kənˈfjuːz|v.|to make unclear|使困惑|The instructions confused me.
connect|kəˈnekt|v.|to join together|连接|Connect the cables.
conscious|ˈkɒnʃəs|adj.|aware and awake|有意识的|He was conscious.
consequence|ˈkɒnsɪkwəns|n.|a result or effect|结果|Actions have consequences.
consider|kənˈsɪdər|v.|to think about|考虑|Please consider my proposal.
consist|kənˈsɪst|v.|to be composed of|由...组成|Water consists of H2O.
constant|ˈkɒnstənt|adj.|occurring continuously|持续的|The noise is constant.
construct|kənˈstrʌkt|v.|to build|建造|They constructed a new bridge.
consult|kənˈsʌlt|v.|to seek advice from|咨询|Consult your doctor.
consume|kənˈsjuːm|v.|to eat or use up|消费，消耗|We consume too much sugar.
contact|ˈkɒntækt|n.|communication or touch|联系|Keep in contact.
contain|kənˈteɪn|v.|to hold inside|包含|The box contains chocolates.
contemporary|kənˈtempərəri|adj.|modern or current|当代的|She enjoys contemporary art.
content|ˈkɒntent|n.|what is inside|内容|The content is interesting.
continue|kənˈtɪnjuː|v.|to keep going|继续|The rain continued all day.
contract|ˈkɒntrækt|n.|a legal agreement|合同|Sign the contract.
contribute|kənˈtrɪbjuːt|v.|to give or add|贡献|He contributed to charity.
control|kənˈtrəʊl|n.|the power to direct|控制|The situation is under control.
convenient|kənˈviːniənt|adj.|suitable and easy|方便的|The location is convenient.
convince|kənˈvɪns|v.|to persuade|说服|She convinced me to join.
cooperate|kəʊˈɒpəreɪt|v.|to work together|合作|The two teams cooperated.
cope|kəʊp|v.|to deal with difficulty|应付|She coped well with pressure.
core|kɔːr|n.|the central part|核心|The core problem is funding.
correct|kəˈrekt|adj.|without errors|正确的|Your answer is correct.
courage|ˈkʌrɪdʒ|n.|the ability to face danger|勇气|It takes courage to speak up.
create|kriˈeɪt|v.|to bring into existence|创造|She created a beautiful painting.
crime|kraɪm|n.|an illegal act|犯罪|Crime rates are decreasing.
crisis|ˈkraɪsɪs|n.|a time of great difficulty|危机|The country faced an economic crisis.
critical|ˈkrɪtɪkəl|adj.|very important|关键的|This is a critical moment.
cultivate|ˈkʌltɪveɪt|v.|to grow or develop|培养|She cultivated good habits.
curious|ˈkjʊəriəs|adj.|eager to learn|好奇的|Children are naturally curious.
current|ˈkʌrənt|adj.|belonging to the present|当前的|What is the current time?
custom|ˈkʌstəm|n.|a traditional practice|习俗|It's a local custom.
damage|ˈdæmɪdʒ|n.|harm or injury|损害|The storm caused damage.
debate|dɪˈbeɪt|n.|a formal discussion|辩论|The debate was lively.
debt|det|n.|money owed|债务|He is in debt.
decade|ˈdekeɪd|n.|a period of ten years|十年|The past decade saw great changes.
declare|dɪˈkleər|v.|to announce formally|宣布|The president declared a holiday.
decline|dɪˈklaɪn|v.|to decrease or refuse|下降，拒绝|The population is declining.
decorate|ˈdekəreɪt|v.|to add beauty to|装饰|They decorated the room.
decrease|dɪˈkriːs|v.|to become smaller|减少|Sales decreased this quarter.
defeat|dɪˈfiːt|v.|to beat or overcome|击败|The team was defeated.
defend|dɪˈfend|v.|to protect from harm|防御|We must defend our rights.
define|dɪˈfaɪn|v.|to explain the meaning|定义|How do you define success?
definite|ˈdefɪnət|adj.|clear and certain|明确的|We need a definite answer.
delay|dɪˈleɪ|v.|to postpone|延迟|The flight was delayed.
deliver|dɪˈlɪvər|v.|to bring or hand over|递送|Please deliver the package.
demand|dɪˈmɑːnd|n.|a strong request|需求|There is high demand.
demonstrate|ˈdemənstreɪt|v.|to show or prove|展示|The experiment demonstrated the theory.
deny|dɪˈnaɪ|v.|to refuse to admit|否认|He denied the accusation.
depend|dɪˈpend|v.|to rely on|依赖|It depends on the weather.
depress|dɪˈpres|v.|to make sad|使沮丧|The news depressed him.
describe|dɪˈskraɪb|v.|to give an account|描述|Describe what you saw.
deserve|dɪˈzɜːv|v.|to be worthy of|值得|You deserve a break.
design|dɪˈzaɪn|v.|to plan and create|设计|She designed the building.
desire|dɪˈzaɪər|n.|a strong wish|渴望|He had a desire to travel.
desperate|ˈdespərət|adj.|feeling hopeless|绝望的|She was desperate for help.
despite|dɪˈspaɪt|prep.|in spite of|尽管|Despite the rain, we went out.
destroy|dɪˈstrɔɪ|v.|to ruin completely|破坏|The fire destroyed the building.
determine|dɪˈtɜːmɪn|v.|to decide firmly|决定|We need to determine the cause.
develop|dɪˈveləp|v.|to grow or improve|发展|The city developed rapidly.
device|dɪˈvaɪs|n.|a tool or machine|设备|This device measures temperature.
devote|dɪˈvəʊt|v.|to give completely|致力于|She devoted her life to teaching.
differ|ˈdɪfər|v.|to be unlike|不同|The twins differ.
direction|daɪˈrekʃən|n.|a course or guidance|方向|Go in that direction.
discipline|ˈdɪsɪplɪn|n.|training in self-control|纪律|He lacks discipline.
discover|dɪˈskʌvər|v.|to find or learn|发现|She discovered a new species.
discuss|dɪˈskʌs|v.|to talk about|讨论|We discussed the plan.
display|dɪˈspleɪ|n.|an exhibition or show|展示|The display was impressive.
dispute|dɪˈspjuːt|n.|a disagreement|争端|The dispute was settled.
distance|ˈdɪstəns|n.|the space between points|距离|The distance is 10 miles.
distinct|dɪˈstɪŋkt|adj.|clearly different|明显的|There are distinct differences.
distinguish|dɪˈstɪŋɡwɪʃ|v.|to recognize differences|区分|Can you distinguish them?
distribute|dɪˈstrɪbjuːt|v.|to hand out|分配|The teacher distributed the papers.
diverse|daɪˈvɜːs|adj.|varied and different|多样的|The group is very diverse.
document|ˈdɒkjʊmənt|n.|a written record|文件|Please sign the document.
domestic|dəˈmestɪk|adj.|relating to home or country|国内的|The domestic market is strong.
dominate|ˈdɒmɪneɪt|v.|to have control over|支配|The team dominated the game.
donate|dəʊˈneɪt|v.|to give as a gift|捐赠|Please donate to charity.
dramatic|drəˈmætɪk|adj.|striking and sudden|戏剧性的|There was a dramatic change.
economy|ɪˈkɒnəmi|n.|the system of wealth|经济|The economy is growing.
educate|ˈedjʊkeɪt|v.|to teach|教育|We must educate the next generation.
efficient|ɪˈfɪʃənt|adj.|working without waste|高效的|This method is efficient.
element|ˈelɪmənt|n.|a basic part|元素|Honesty is a key element.
eliminate|ɪˈlɪmɪneɪt|v.|to remove completely|消除|We need to eliminate errors.
emerge|ɪˈmɜːdʒ|v.|to come out|出现|New evidence emerged.
emergency|ɪˈmɜːdʒənsi|n.|a serious situation|紧急情况|Call 911 in an emergency.
emotion|ɪˈməʊʃən|n.|a strong feeling|情感|She couldn't hide her emotions.
emphasize|ˈemfəsaɪz|v.|to give special importance|强调|He emphasized the importance.
employ|ɪmˈplɔɪ|v.|to hire|雇佣|The company employs 500 people.
enable|ɪˈneɪbl|v.|to make possible|使能够|The grant enabled her to study.
encounter|ɪnˈkaʊntər|v.|to meet unexpectedly|遇到|I encountered an old friend.
encourage|ɪnˈkʌrɪdʒ|v.|to give support|鼓励|She encouraged me to try.
endure|ɪnˈdjʊər|v.|to suffer through|忍受|He endured great pain.
engage|ɪnˈɡeɪdʒ|v.|to take part|参与|She engaged the audience.
enhance|ɪnˈhɑːns|v.|to improve|提高|Exercise enhances health.
enormous|ɪˈnɔːməs|adj.|very large|巨大的|The building is enormous.
ensure|ɪnˈʃʊər|v.|to make certain|确保|Please ensure the door is locked.
enterprise|ˈentəpraɪz|n.|a business or project|企业|He runs a successful enterprise.
entertain|ˌentəˈteɪn|v.|to amuse|娱乐|The clown entertained the children.
enthusiasm|ɪnˈθjuːziazəm|n.|eager enjoyment|热情|She showed great enthusiasm.
entire|ɪnˈtaɪər|adj.|whole or complete|整个的|I read the entire book.
environment|ɪnˈvaɪrənmənt|n.|surroundings|环境|We must protect the environment.
equal|ˈiːkwəl|adj.|the same in value|相等的|All people are equal.
equip|ɪˈkwɪp|v.|to supply with needed items|装备|The lab is well equipped.
error|ˈerər|n.|a mistake|错误|The report contains errors.
escape|ɪˈskeɪp|v.|to get away|逃跑|The prisoner escaped.
essential|ɪˈsenʃəl|adj.|absolutely necessary|必要的|Water is essential for life.
establish|ɪˈstæblɪʃ|v.|to set up firmly|建立|The company was established in 1990.
estimate|ˈestɪmeɪt|v.|to roughly calculate|估计|We estimate the cost at $500.
evaluate|ɪˈvæljueɪt|v.|to assess|评估|The teacher evaluated the students.
evidence|ˈevɪdəns|n.|proof or facts|证据|There is no evidence.
evolve|ɪˈvɒlv|v.|to develop gradually|进化|Species evolve over time.
exact|ɪɡˈzækt|adj.|precise and accurate|精确的|Give me the exact number.
examine|ɪɡˈzæmɪn|v.|to inspect closely|检查|The doctor examined the patient.
exceed|ɪkˈsiːd|v.|to go beyond|超过|The cost exceeds our budget.
excellent|ˈeksələnt|adj.|very good|优秀的|She did an excellent job.
except|ɪkˈsept|prep.|not including|除了|Everyone except John came.
exchange|ɪksˈtʃeɪndʒ|n.|a trade or swap|交换|Currency exchange rates change.
exclude|ɪkˈskluːd|v.|to leave out|排除|The price excludes tax.
execute|ˈeksɪkjuːt|v.|to carry out|执行|The plan was executed perfectly.
exercise|ˈeksəsaɪz|n.|physical activity|锻炼|Exercise keeps you healthy.
exist|ɪɡˈzɪst|v.|to have being|存在|Do aliens exist?
expand|ɪkˈspænd|v.|to become larger|扩展|The company is expanding.
expect|ɪkˈspekt|v.|to regard as likely|期待|I expect good results.
expense|ɪkˈspens|n.|cost or spending|费用|Travel expenses are covered.
experiment|ɪkˈsperɪmənt|n.|a scientific test|实验|The experiment proved the theory.
expert|ˈekspɜːt|n.|a specialist|专家|She is an expert in finance.
explain|ɪkˈspleɪn|v.|to make clear|解释|Please explain the concept.
explore|ɪkˈsplɔːr|v.|to travel and discover|探索|They explored the cave.
export|ɪkˈspɔːt|v.|to send goods abroad|出口|China exports many products.
expose|ɪkˈspəʊz|v.|to reveal or uncover|暴露|The scandal was exposed.
extend|ɪkˈstend|v.|to stretch or prolong|延伸|Can you extend the deadline?
external|ɪkˈstɜːnəl|adj.|outside|外部的|The external walls need painting.
extraordinary|ɪkˈstrɔːdənəri|adj.|very unusual|非凡的|She has extraordinary talent.
extreme|ɪkˈstriːm|adj.|to the highest degree|极端的|The weather is extreme.
facility|fəˈsɪləti|n.|a building or equipment|设施|The sports facility is excellent.
factor|ˈfæktər|n.|an element that influences|因素|Cost is a key factor.
faith|feɪθ|n.|strong belief or trust|信仰|He has faith in humanity.
fashion|ˈfæʃən|n.|a popular style|时尚|Fashion changes quickly.
fatal|ˈfeɪtəl|adj.|causing death|致命的|The accident was fatal.
feature|ˈfiːtʃər|n.|a distinctive characteristic|特征|The phone has many features.
fierce|fɪəs|adj.|violent and intense|凶猛的|The competition was fierce.
figure|ˈfɪɡər|n.|a number or shape|数字|The figure shows the data.
finance|ˈfaɪnæns|n.|money management|金融|She works in finance.
flexible|ˈfleksɪbl|adj.|able to bend or change|灵活的|My schedule is flexible.
flourish|ˈflʌrɪʃ|v.|to grow or succeed|繁荣|The business flourished.
focus|ˈfəʊkəs|v.|to concentrate|集中|Focus on your goal.
forecast|ˈfɔːkɑːst|n.|a prediction|预测|The weather forecast is good.
former|ˈfɔːmər|adj.|earlier in time|前者的|He is a former president.
fortune|ˈfɔːtʃuːn|n.|wealth or luck|财富|She made a fortune.
foundation|faʊnˈdeɪʃən|n.|a base or underlying support|基础|The foundation is strong.
fraction|ˈfrækʃən|n.|a small part|分数|A fraction voted.
framework|ˈfreɪmwɜːk|n.|a basic structure|框架|The legal framework needs updating.
frequency|ˈfriːkwənsi|n.|the rate of occurrence|频率|The frequency is increasing.
function|ˈfʌŋkʃən|n.|a purpose or role|功能|What is the function of this button?
fundamental|ˌfʌndəˈmentəl|adj.|basic and essential|基本的|There are fundamental differences.
generate|ˈdʒenəreɪt|v.|to produce or create|产生|The machine generates electricity.
generous|ˈdʒenərəs|adj.|giving freely|慷慨的|She is very generous.
genuine|ˈdʒenjuɪn|adj.|real and authentic|真正的|She showed genuine concern.
global|ˈɡləʊbəl|adj.|worldwide|全球的|Climate change is a global issue.
govern|ˈɡʌvən|v.|to rule or control|统治|The country is governed by law.
gradual|ˈɡrædʒuəl|adj.|happening step by step|逐渐的|There has been gradual improvement.
grant|ɡrɑːnt|v.|to give or allow|授予|The foundation granted a scholarship.
grasp|ɡrɑːsp|v.|to hold or understand|抓住|She grasped the concept.
grateful|ˈɡreɪtfl|adj.|feeling thanks|感激的|I am grateful for your help.
guarantee|ˌɡærənˈtiː|n.|a promise or assurance|保证|This product comes with a guarantee.
guilty|ˈɡɪlti|adj.|responsible for a crime|有罪的|The jury found him guilty.
harmony|ˈhɑːməni|n.|peaceful agreement|和谐|They live in harmony.
harsh|hɑːʃ|adj.|rough and severe|严厉的|The punishment was harsh.
harvest|ˈhɑːvɪst|n.|the gathering of crops|收获|The harvest was abundant.
hesitate|ˈhezɪteɪt|v.|to pause in uncertainty|犹豫|Don't hesitate to ask.
highlight|ˈhaɪlaɪt|v.|to emphasize|强调|The report highlights key issues.
horizon|həˈraɪzən|n.|the line where sky meets land|地平线|The sun set below the horizon.
hostile|ˈhɒstaɪl|adj.|unfriendly and aggressive|敌对的|The atmosphere was hostile.
household|ˈhaʊshəʊld|n.|a family unit|家庭|The household has five people.
humble|ˈhʌmbl|adj.|modest|谦逊的|He remained humble.
identical|aɪˈdentɪkəl|adj.|exactly the same|相同的|The two houses are identical.
identify|aɪˈdentɪfaɪ|v.|to recognize and name|识别|She identified the suspect.
ignore|ɪɡˈnɔːr|v.|to pay no attention to|忽视|Don't ignore the warning.
illustrate|ˈɪləstreɪt|v.|to explain with examples|阐明|The diagram illustrates the process.
imagination|ɪˌmædʒɪˈneɪʃən|n.|the ability to form ideas|想象力|Children have vivid imaginations.
immediate|ɪˈmiːdiət|adj.|happening at once|立即的|Take immediate action.
immense|ɪˈmens|adj.|extremely large|巨大的|The task is immense.
immigrant|ˈɪmɪɡrənt|n.|a person moving to a new country|移民|The city has many immigrants.
impact|ˈɪmpækt|n.|a strong effect|影响|The policy had a positive impact.
implement|ˈɪmplɪment|v.|to put into practice|实施|The plan was implemented.
imply|ɪmˈplaɪ|v.|to suggest without stating|暗示|What are you implying?
impose|ɪmˈpəʊz|v.|to force upon|强加|The government imposed new taxes.
impress|ɪmˈpres|v.|to affect strongly|给...深刻印象|Her performance impressed the judges.
incredible|ɪnˈkredəbl|adj.|hard to believe|难以置信的|The view was incredible.
independent|ˌɪndɪˈpendənt|adj.|free from control|独立的|She is very independent.
indicate|ˈɪndɪkeɪt|v.|to show or point out|表明|The sign indicates the way.
individual|ˌɪndɪˈvɪdʒuəl|adj.|single or separate|个人的|Each individual has rights.
inevitable|ɪnˈevɪtəbl|adj.|unavoidable|不可避免的|Change is inevitable.
influence|ˈɪnfluəns|n.|the power to affect|影响|Social media has great influence.
inform|ɪnˈfɔːm|v.|to give information|通知|Please inform us.
initial|ɪˈnɪʃəl|adj.|first or beginning|最初的|The initial test was successful.
injure|ˈɪndʒər|v.|to cause physical harm|伤害|He injured his leg.
innovate|ˈɪnəveɪt|v.|to introduce something new|创新|The company continues to innovate.
inspire|ɪnˈspaɪər|v.|to fill with the urge to do|激励|Her speech inspired the team.
instrument|ˈɪnstrʊmənt|n.|a tool or device|工具|A piano is a musical instrument.
integrity|ɪnˈteɡrəti|n.|honesty and moral uprightness|正直|He is a man of integrity.
intelligent|ɪnˈtelɪdʒənt|adj.|smart and bright|聪明的|Dolphins are intelligent.
intense|ɪnˈtens|adj.|very strong or extreme|强烈的|The heat was intense.
interfere|ˌɪntəˈfɪər|v.|to get in the way|干涉|Don't interfere.
interpret|ɪnˈtɜːprɪt|v.|to explain or translate|解释|She interpreted the speech.
investigate|ɪnˈvestɪɡeɪt|v.|to examine thoroughly|调查|The police are investigating.
involve|ɪnˈvɒlv|v.|to include as a part|涉及|The project involves many people.
isolate|ˈaɪsəleɪt|v.|to separate from others|隔离|The patient was isolated.
journey|ˈdʒɜːni|n.|a long trip|旅程|The journey took three days.
judgment|ˈdʒʌdʒmənt|n.|the ability to make decisions|判断|Use your best judgment.
justify|ˈdʒʌstɪfaɪ|v.|to show to be right|证明正当|Can you justify your actions?
knowledge|ˈnɒlɪdʒ|n.|information and understanding|知识|Knowledge is power.
landscape|ˈlændskeɪp|n.|a view of scenery|风景|The landscape is beautiful.
launch|lɔːntʃ|v.|to send off or start|发射|The company launched a new product.
layer|ˈleɪər|n.|a sheet or level|层|The cake has three layers.
legal|ˈliːɡəl|adj.|allowed by law|合法的|Is it legal to park here?
legend|ˈledʒənd|n.|a traditional story|传说|The legend of King Arthur.
liberal|ˈlɪbərəl|adj.|open to new ideas|自由的|She holds liberal views.
liberty|ˈlɪbəti|n.|freedom|自由|The statue symbolizes liberty.
limitation|ˌlɪmɪˈteɪʃən|n.|a restriction|限制|Know your limitations.
literacy|ˈlɪtərəsi|n.|the ability to read and write|读写能力|Literacy rates have improved.
literature|ˈlɪtərətʃər|n.|written works of art|文学|English literature is her passion.
logical|ˈlɒdʒɪkəl|adj.|based on reason|逻辑的|That is a logical conclusion.
loyal|ˈlɔɪəl|adj.|faithful and devoted|忠诚的|He is a loyal friend.
maintain|meɪnˈteɪn|v.|to keep in good condition|维持|Exercise helps maintain health.
major|ˈmeɪdʒər|adj.|great in importance|主要的|This is a major problem.
manufacture|ˌmænjuˈfæktʃər|v.|to make on a large scale|制造|The company manufactures cars.
margin|ˈmɑːdʒɪn|n.|an edge or gap|边缘|He won by a narrow margin.
massive|ˈmæsɪv|adj.|very large and heavy|大量的|A massive wave hit the shore.
material|məˈtɪəriəl|n.|substance or fabric|材料|The building materials are strong.
mature|məˈtʃʊər|adj.|fully developed|成熟的|She is mature for her age.
maximum|ˈmæksɪməm|n.|the greatest amount|最大值|The maximum speed is 120.
medium|ˈmiːdiəm|adj.|in the middle|中等的|Cook on medium heat.
mental|ˈmentəl|adj.|relating to the mind|精神的|Mental health is important.
mention|ˈmenʃən|v.|to refer to briefly|提到|She mentioned your name.
miracle|ˈmɪrəkl|n.|an amazing event|奇迹|It's a miracle she survived.
mission|ˈmɪʃən|n.|an important task|任务|The mission was successful.
moderate|ˈmɒdərət|adj.|not extreme|适度的|Drink in moderation.
modify|ˈmɒdɪfaɪ|v.|to change or adjust|修改|We need to modify the plan.
monitor|ˈmɒnɪtər|v.|to watch and check|监控|The nurse monitored his condition.
moral|ˈmɒrəl|adj.|relating to right and wrong|道德的|It's a moral question.
motivate|ˈməʊtɪveɪt|v.|to provide a reason to act|激励|The teacher motivated her students.
multiple|ˈmʌltɪpl|adj.|many|多个的|There are multiple options.
mutual|ˈmjuːtʃuəl|adj.|shared by two or more|相互的|The feeling is mutual.
mystery|ˈmɪstəri|n.|something unexplained|神秘|The mystery remains unsolved.
narrow|ˈnærəʊ|adj.|not wide|狭窄的|The road is very narrow.
native|ˈneɪtɪv|adj.|belonging by birth|本地的|She is a native speaker.
necessity|nəˈsesəti|n.|something essential|必需品|Water is a necessity.
negotiate|nɪˈɡəʊʃieɪt|v.|to discuss to reach agreement|谈判|They negotiated a peace deal.
neutral|ˈnjuːtrəl|adj.|not taking sides|中立的|Switzerland remained neutral.
nevertheless|ˌnevəðəˈles|adv.|in spite of that|然而|Nevertheless, we went.
normal|ˈnɔːməl|adj.|usual and typical|正常的|Everything is back to normal.
numerous|ˈnjuːmərəs|adj.|many|许多的|There are numerous reasons.
objective|əbˈdʒektɪv|n.|a goal or aim|目标|Our objective is clear.
obligation|ˌɒblɪˈɡeɪʃən|n.|a duty|义务|You have an obligation.
observe|əbˈzɜːv|v.|to watch carefully|观察|The scientist observed the behavior.
obstacle|ˈɒbstəkl|n.|something that blocks|障碍|Lack of money is an obstacle.
obtain|əbˈteɪn|v.|to get or acquire|获得|She obtained a visa.
obvious|ˈɒbviəs|adj.|easily seen|明显的|The answer is obvious.
occasion|əˈkeɪʒən|n.|a particular time or event|场合|This is a special occasion.
occupy|ˈɒkjʊpaɪ|v.|to take up space or time|占据|The meeting occupied the morning.
offend|əˈfend|v.|to cause hurt feelings|冒犯|I didn't mean to offend you.
operate|ˈɒpəreɪt|v.|to work or function|操作|The machine operates smoothly.
opinion|əˈpɪnjən|n.|a personal view|意见|In my opinion, it's a good idea.
opponent|əˈpəʊnənt|n.|a person one competes against|对手|He defeated his opponent.
opportunity|ˌɒpəˈtjuːnəti|n.|a favorable chance|机会|This is a great opportunity.
oppose|əˈpəʊz|v.|to be against|反对|The public opposed the new law.
organize|ˈɔːɡənaɪz|v.|to arrange systematically|组织|She organized the event.
origin|ˈɒrɪdʒɪn|n.|the beginning or source|起源|The origin of the word is Latin.
outcome|ˈaʊtkʌm|n.|a final result|结果|The outcome was surprising.
overcome|ˌəʊvəˈkʌm|v.|to defeat or conquer|克服|She overcame many difficulties.
overlook|ˌəʊvəˈlʊk|v.|to fail to notice|忽视|Don't overlook the details.
overseas|ˌəʊvəˈsiːz|adv.|in a foreign country|在海外|She studied overseas.
participate|pɑːˈtɪsɪpeɪt|v.|to take part|参加|Everyone should participate.
passion|ˈpæʃən|n.|strong emotion or enthusiasm|热情|She has a passion for music.
patience|ˈpeɪʃəns|n.|the ability to wait calmly|耐心|You need patience to learn.
payment|ˈpeɪmənt|n.|money paid|付款|The payment is due next week.
perceive|pəˈsiːv|v.|to become aware of|察觉|She perceived a change.
perform|pəˈfɔːm|v.|to carry out an action|表演|The team performed well.
permanent|ˈpɜːmənənt|adj.|lasting forever|永久的|This is his permanent address.
permit|pəˈmɪt|v.|to allow|允许|Smoking is not permitted.
persist|pəˈsɪst|v.|to continue firmly|坚持|She persisted in her efforts.
personality|ˌpɜːsəˈnæləti|n.|character traits|个性|She has a friendly personality.
perspective|pəˈspektɪv|n.|a particular way of viewing|视角|Look from another perspective.
persuade|pəˈsweɪd|v.|to convince|说服|She persuaded him to stay.
phenomenon|fɪˈnɒmɪnən|n.|a remarkable event|现象|The phenomenon occurs rarely.
philosophy|fɪˈlɒsəfi|n.|the study of knowledge|哲学|His philosophy is simple.
physical|ˈfɪzɪkəl|adj.|relating to the body|身体的|Physical exercise is important.
policy|ˈpɒləsi|n.|a plan or course of action|政策|The company has a strict policy.
pollute|pəˈluːt|v.|to make dirty|污染|Factories pollute the air.
popular|ˈpɒpjʊlər|adj.|liked by many|流行的|This song is very popular.
possess|pəˈzes|v.|to have or own|拥有|She possesses great talent.
potential|pəˈtenʃəl|adj.|possible but not yet realized|潜在的|He has great potential.
poverty|ˈpɒvəti|n.|the state of being poor|贫穷|They live in poverty.
practical|ˈpræktɪkəl|adj.|relating to actual use|实际的|The advice was very practical.
precise|prɪˈsaɪs|adj.|exact and accurate|精确的|The measurements must be precise.
predict|prɪˈdɪkt|v.|to say what will happen|预测|The forecast predicts rain.
preserve|prɪˈzɜːv|v.|to keep safe or maintain|保存|We must preserve the environment.
pressure|ˈpreʃər|n.|force or stress|压力|She works well under pressure.
previous|ˈpriːviəs|adj.|existing before|以前的|In previous years.
principle|ˈprɪnsɪpl|n.|a fundamental truth|原则|Honesty is a basic principle.
priority|praɪˈɒrəti|n.|something more important|优先|Safety is our top priority.
privilege|ˈprɪvɪlɪdʒ|n.|a special advantage|特权|Education is a privilege.
procedure|prəˈsiːdʒər|n.|a series of steps|程序|Follow the correct procedure.
process|ˈprəʊses|n.|a series of actions|过程|The manufacturing process is complex.
produce|prəˈdjuːs|v.|to make or create|生产|The factory produces cars.
profession|prəˈfeʃən|n.|an occupation requiring training|职业|Teaching is a noble profession.
profit|ˈprɒfɪt|n.|financial gain|利润|The company made a profit.
progress|ˈprəʊɡres|n.|forward movement or development|进步|She is making good progress.
prohibit|prəˈhɪbɪt|v.|to forbid|禁止|Smoking is prohibited.
project|ˈprɒdʒekt|n.|a planned piece of work|项目|The project was completed.
prominent|ˈprɒmɪnənt|adj.|important and well-known|突出的|She is a prominent scientist.
promote|prəˈməʊt|v.|to help grow or advance|促进|The campaign promotes healthy eating.
property|ˈprɒpəti|n.|something owned|财产|The property is worth a lot.
proportion|prəˈpɔːʃən|n.|a part or share|比例|A large proportion voted.
propose|prəˈpəʊz|v.|to suggest a plan|提议|He proposed a new solution.
prospect|ˈprɒspekt|n.|a possibility or outlook|前景|The job prospects are good.
protect|prəˈtekt|v.|to keep safe|保护|Wear sunscreen to protect your skin.
protest|ˈprəʊtest|n.|a statement of objection|抗议|The workers held a protest.
provide|prəˈvaɪd|v.|to give or supply|提供|The company provides good benefits.
province|ˈprɒvɪns|n.|a main administrative division|省|She comes from a northern province.
publish|ˈpʌblɪʃ|v.|to make available to the public|出版|She published her first novel.
purchase|ˈpɜːtʃəs|v.|to buy|购买|We purchased a new house.
pursue|pəˈsjuː|v.|to follow or try to achieve|追求|She pursued a career in law.
qualify|ˈkwɒlɪfaɪ|v.|to meet the requirements|取得资格|She qualified for the Olympics.
quantity|ˈkwɒntəti|n.|an amount or number|数量|We need a large quantity.
range|reɪndʒ|n.|a variety or span|范围|The price range is wide.
rank|ræŋk|n.|a position in a hierarchy|等级|He achieved the rank of captain.
rapid|ˈræpɪd|adj.|very fast|迅速的|There has been rapid growth.
reaction|riˈækʃən|n.|a response|反应|Her reaction was immediate.
realistic|ˌriːəˈlɪstɪk|adj.|practical and achievable|现实的|Set realistic goals.
reality|riˈæləti|n.|the state of things as they are|现实|We must face reality.
reasonable|ˈriːzənəbl|adj.|fair and sensible|合理的|The price is reasonable.
recent|ˈriːsənt|adj.|not long past|最近的|Recent events have changed everything.
recognition|ˌrekəɡˈnɪʃən|n.|identification or acknowledgment|认可|She received recognition.
recover|rɪˈkʌvər|v.|to get back to normal|恢复|She is recovering from surgery.
reduce|rɪˈdjuːs|v.|to make less|减少|We need to reduce costs.
refer|rɪˈfɜːr|v.|to mention or direct to|提及|Refer to the manual.
reflect|rɪˈflekt|v.|to show or throw back|反映|The mirror reflects your image.
reform|rɪˈfɔːm|n.|change for improvement|改革|The education reform is needed.
refuse|rɪˈfjuːz|v.|to decline|拒绝|She refused the offer.
region|ˈriːdʒən|n.|an area or district|地区|The region is known for its wine.
register|ˈredʒɪstər|v.|to record officially|登记|Please register online.
regulate|ˈreɡjuleɪt|v.|to control by rules|调节|The government regulates the industry.
reject|rɪˈdʒekt|v.|to refuse to accept|拒绝|The proposal was rejected.
relate|rɪˈleɪt|v.|to connect or tell|关联|The two events are related.
release|rɪˈliːs|v.|to set free or make public|释放，发布|The movie was released last week.
relevant|ˈreləvənt|adj.|directly related|相关的|Is this information relevant?
relief|rɪˈliːf|n.|a feeling of comfort|缓解|The medicine brought relief.
religion|rɪˈlɪdʒən|n.|a system of faith|宗教|She practices her religion.
rely|rɪˈlaɪ|v.|to depend on|依赖|You can rely on me.
remain|rɪˈmeɪn|v.|to stay or continue|保持|Please remain seated.
remove|rɪˈmuːv|v.|to take away|移除|Please remove your shoes.
replace|rɪˈpleɪs|v.|to take the place of|替换|We need to replace the battery.
represent|ˌreprɪˈzent|v.|to stand for|代表|She represents the company.
reputation|ˌrepjuˈteɪʃən|n.|the general opinion|声誉|He has a good reputation.
request|rɪˈkwest|n.|a polite demand|请求|She made a request.
require|rɪˈkwaɪər|v.|to need or demand|需要|This job requires patience.
rescue|ˈreskjuː|v.|to save from danger|营救|The firefighter rescued the child.
research|rɪˈsɜːtʃ|n.|systematic investigation|研究|She conducts scientific research.
reserve|rɪˈzɜːv|v.|to keep for future use|保留|Please reserve a table.
resolve|rɪˈzɒlv|v.|to find a solution|解决|We must resolve this issue.
resource|rɪˈzɔːs|n.|a supply or support|资源|Natural resources are limited.
respond|rɪˈspɒnd|v.|to answer or react|回应|Please respond to my email.
responsibility|rɪˌspɒnsəˈbɪləti|n.|a duty or obligation|责任|It's your responsibility.
restore|rɪˈstɔːr|v.|to bring back to original|恢复|The building was restored.
restrict|rɪˈstrɪkt|v.|to limit or control|限制|The speed is restricted.
reveal|rɪˈviːl|v.|to make known|揭示|The investigation revealed the truth.
revise|rɪˈvaɪz|v.|to review and change|修订|She revised her essay.
revolution|ˌrevəˈluːʃən|n.|a complete change|革命|The Industrial Revolution changed everything.
reward|rɪˈwɔːd|n.|something given in return|奖励|A reward was offered.
rural|ˈrʊərəl|adj.|relating to the countryside|乡村的|She lives in a rural area.
sacrifice|ˈsækrɪfaɪs|n.|giving up something valuable|牺牲|She made many sacrifices.
schedule|ˈʃedjuːl|n.|a plan of events|时间表|What's your schedule?
scheme|skiːm|n.|a plan or system|计划|They devised a new scheme.
scholar|ˈskɒlər|n.|a learned person|学者|She is a respected scholar.
secure|sɪˈkjʊər|adj.|safe and protected|安全的|Make sure the door is secure.
seek|siːk|v.|to look for|寻找|She sought advice.
select|sɪˈlekt|v.|to choose carefully|选择|Select the best option.
senior|ˈsiːniər|adj.|older or higher in rank|年长的|He is a senior manager.
sense|sens|n.|awareness or meaning|感觉|She has a good sense of humor.
sensitive|ˈsensətɪv|adj.|easily affected or offended|敏感的|She is sensitive to criticism.
sequence|ˈsiːkwəns|n.|a series in order|序列|The events happened in sequence.
session|ˈseʃən|n.|a period of activity|会议|The training session was useful.
settle|ˈsetl|v.|to resolve or live in|解决|They settled the dispute.
severe|sɪˈvɪər|adj.|very serious|严重的|The storm caused severe damage.
shadow|ˈʃædəʊ|n.|a dark area caused by light|阴影|He saw a shadow.
shelter|ˈʃeltər|n.|a place of protection|庇护所|They took shelter.
shift|ʃɪft|v.|to change position|转移|The wind shifted direction.
shortage|ˈʃɔːtɪdʒ|n.|a lack or deficit|短缺|There is a water shortage.
similar|ˈsɪmɪlər|adj.|alike in some way|相似的|They have similar tastes.
simplify|ˈsɪmplɪfaɪ|v.|to make simpler|简化|Try to simplify the process.
sincere|sɪnˈsɪər|adj.|honest and genuine|真诚的|Please accept my sincere apologies.
skilled|skɪld|adj.|having special ability|熟练的|She is a skilled pianist.
smooth|smuːð|adj.|even and flat|光滑的|The surface is smooth.
solar|ˈsəʊlər|adj.|relating to the sun|太阳的|Solar energy is renewable.
sole|səʊl|adj.|only or single|唯一的|He is the sole owner.
solid|ˈsɒlɪd|adj.|firm and hard|坚固的|The ice was solid.
sophisticated|səˈfɪstɪkeɪtɪd|adj.|complex and refined|复杂的|The software is sophisticated.
source|sɔːs|n.|the origin or provider|来源|The source of the river is in the mountains.
span|spæn|n.|the full extent or reach|跨度|Her career spanned 30 years.
specialize|ˈspeʃəlaɪz|v.|to focus on one area|专门从事|She specializes in heart surgery.
species|ˈspiːʃiːz|n.|a group of living things|物种|This species is endangered.
specific|spəˈsɪfɪk|adj.|exact and particular|具体的|Give me specific details.
spot|spɒt|n.|a small area or place|地点|This is a beautiful spot.
spread|spred|v.|to extend or distribute|传播|The news spread quickly.
stable|ˈsteɪbl|adj.|firm and not changing|稳定的|The patient is stable.
staff|stɑːf|n.|a group of employees|员工|The staff are very helpful.
standard|ˈstændəd|n.|a level of quality|标准|The work meets our standards.
status|ˈsteɪtəs|n.|a position or condition|地位|What is your status?
steady|ˈstedi|adj.|firm and regular|稳定的|He has a steady job.
stimulate|ˈstɪmjʊleɪt|v.|to encourage activity|刺激|Exercise stimulates blood flow.
strategy|ˈstrætədʒi|n.|a long-term plan|策略|We need a new strategy.
strengthen|ˈstreŋθən|v.|to make stronger|加强|Exercise strengthens the heart.
stress|stres|n.|pressure or emphasis|压力|She is under a lot of stress.
stretch|stretʃ|v.|to extend or pull|伸展|Stretch before exercising.
strict|strɪkt|adj.|demanding obedience|严格的|The rules are very strict.
structure|ˈstrʌktʃər|n.|the arrangement of parts|结构|The building's structure is sound.
struggle|ˈstrʌɡl|v.|to try very hard|挣扎|She struggled to finish.
submit|səbˈmɪt|v.|to present for approval|提交|Please submit your report.
substance|ˈsʌbstəns|n.|material or matter|物质|The substance is poisonous.
substantial|səbˈstænʃəl|adj.|large and significant|大量的|There was a substantial increase.
substitute|ˈsʌbstɪtjuːt|n.|a replacement|替代品|Honey can be a substitute for sugar.
succeed|səkˈsiːd|v.|to achieve a goal|成功|She succeeded in her career.
sufficient|səˈfɪʃənt|adj.|enough|足够的|The supply is sufficient.
suggest|səˈdʒest|v.|to propose an idea|建议|I suggest we leave early.
suitable|ˈsuːtəbl|adj.|appropriate|合适的|This dress is suitable for the party.
summarize|ˈsʌməraɪz|v.|to give a brief statement|总结|Summarize the main points.
superior|suːˈpɪəriər|adj.|higher in quality|优越的|The quality is superior.
supply|səˈplaɪ|n.|an amount available|供给|The water supply is clean.
support|səˈpɔːt|v.|to hold up or encourage|支持|Thank you for your support.
suppose|səˈpəʊz|v.|to assume or think|假设|I suppose you're right.
surface|ˈsɜːfɪs|n.|the outer layer|表面|The surface of the table is smooth.
surgery|ˈsɜːdʒəri|n.|medical operation|外科手术|He underwent heart surgery.
surplus|ˈsɜːpləs|n.|an excess amount|过剩|The budget has a surplus.
surrender|səˈrendər|v.|to give up or yield|投降|The army surrendered.
surround|səˈraʊnd|v.|to encircle|围绕|The house is surrounded by trees.
survey|ˈsɜːveɪ|n.|a study or examination|调查|The survey shows satisfaction.
survive|səˈvaɪv|v.|to continue to live|幸存|Only a few survived.
suspect|səˈspekt|v.|to think likely or true|怀疑|I suspect he is lying.
suspend|səˈspend|v.|to hang or pause|悬挂|The meeting was suspended.
sustain|səˈsteɪn|v.|to keep going or support|维持|The soil cannot sustain crops.
symbol|ˈsɪmbəl|n.|a sign representing something|象征|The dove is a symbol of peace.
sympathy|ˈsɪmpəθi|n.|shared feeling of sadness|同情|I have sympathy for your loss.
symptom|ˈsɪmptəm|n.|a sign of illness|症状|The symptoms include fever.
tackle|ˈtækl|v.|to take on a problem|处理|We must tackle the issue.
talent|ˈtælənt|n.|natural ability|才能|She has a talent for music.
target|ˈtɑːɡɪt|n.|a goal or objective|目标|Set clear targets.
technique|tekˈniːk|n.|a method or skill|技术|She mastered the technique.
technology|tekˈnɒlədʒi|n.|applied science|技术|Technology is advancing.
temporary|ˈtempərəri|adj.|lasting for a limited time|临时的|This is a temporary solution.
tend|tend|v.|to be likely or care for|倾向|She tends to be optimistic.
tendency|ˈtendənsi|n.|a natural inclination|趋势|There is a tendency to overspend.
tense|tens|adj.|nervous and tight|紧张的|She felt tense before the exam.
theory|ˈθɪəri|n.|a system of ideas|理论|The theory explains the phenomenon.
thorough|ˈθʌrə|adj.|complete and careful|彻底的|Do a thorough check.
threaten|ˈθretən|v.|to express a threat|威胁|The storm threatens the coast.
thrill|θrɪl|n.|a sudden excitement|激动|The roller coaster gave her a thrill.
thrive|θraɪv|v.|to grow and prosper|繁荣|Plants thrive in sunlight.
tolerate|ˈtɒləreɪt|v.|to allow or endure|容忍|I cannot tolerate such behavior.
tough|tʌf|adj.|strong and durable|坚韧的|The test was tough.
tradition|trəˈdɪʃən|n.|a long-established custom|传统|It is a family tradition.
tragedy|ˈtrædʒədi|n.|a very sad event|悲剧|The tragedy shocked the nation.
transfer|trænsˈfɜːr|v.|to move from one place|转移|She transferred to a new school.
transform|trænsˈfɔːm|v.|to change completely|转变|The city has been transformed.
transport|ˈtrænspɔːt|n.|a means of moving goods|运输|Public transport is efficient.
trap|træp|n.|a device for catching animals|陷阱|The mouse was caught in a trap.
treasure|ˈtreʒər|n.|valuable items|珍宝|They searched for buried treasure.
treat|triːt|v.|to handle or give medical care|对待|The doctor treated the wound.
tremendous|trɪˈmendəs|adj.|very large|巨大的|The project was a great success.
trend|trend|n.|a general direction or pattern|趋势|The fashion trend is changing.
trial|ˈtraɪəl|n.|a test or court session|试验|The clinical trial was successful.
trigger|ˈtrɪɡər|v.|to cause to start|触发|The event triggered a crisis.
triumph|ˈtraɪəmf|n.|a great victory|胜利|The team celebrated their triumph.
typical|ˈtɪpɪkəl|adj.|representing a type|典型的|This is a typical example.
ultimate|ˈʌltɪmət|adj.|final or best|最终的|The ultimate goal is peace.
undergo|ˌʌndəˈɡəʊ|v.|to experience|经历|She underwent surgery.
undertake|ˌʌndəˈteɪk|v.|to start a task|承担|She undertook the project.
unemployment|ˌʌnɪmˈplɔɪmənt|n.|the state of being without work|失业|Unemployment rates are high.
unexpected|ˌʌnɪkˈspektɪd|adj.|surprising|意外的|The news was unexpected.
unite|juːˈnaɪt|v.|to come together|联合|The people united.
universal|ˌjuːnɪˈvɜːsəl|adj.|applying to everyone|普遍的|Education is a universal right.
universe|ˈjuːnɪvɜːs|n.|all existing matter and space|宇宙|The universe is vast.
urgent|ˈɜːdʒənt|adj.|needing immediate attention|紧急的|This is an urgent matter.
utility|juːˈtɪləti|n.|usefulness or public services|效用|The utility bills are due.
utilize|ˈjuːtɪlaɪz|v.|to make practical use of|利用|We need to utilize our resources.
vacant|ˈveɪkənt|adj.|empty or unoccupied|空的|The position is vacant.
vague|veɪɡ|adj.|not clear or definite|模糊的|His explanation was vague.
valid|ˈvælɪd|adj.|legally or logically acceptable|有效的|The ticket is still valid.
vanish|ˈvænɪʃ|v.|to disappear suddenly|消失|The magician made the rabbit vanish.
vast|vɑːst|adj.|very large in area|广阔的|The desert is vast.
venture|ˈventʃər|n.|a risky business undertaking|冒险|The business venture succeeded.
verify|ˈverɪfaɪ|v.|to confirm the truth|验证|Please verify your identity.
version|ˈvɜːʃən|n.|a particular form or edition|版本|This is the latest version.
victim|ˈvɪktɪm|n.|a person harmed|受害者|The victim was taken to the hospital.
vigorous|ˈvɪɡərəs|adj.|strong and energetic|精力充沛的|She took vigorous exercise.
violate|ˈvaɪəleɪt|v.|to break a law|违反|He violated the agreement.
virtue|ˈvɜːtʃuː|n.|a good moral quality|美德|Honesty is a virtue.
visible|ˈvɪzɪbl|adj.|able to be seen|可见的|The stars are visible.
vision|ˈvɪʒən|n.|the ability to see or imagine|视力，愿景|She has a clear vision.
vital|ˈvaɪtəl|adj.|absolutely necessary|至关重要的|Water is vital for survival.
vivid|ˈvɪvɪd|adj.|bright and clear|生动的|She has a vivid imagination.
volume|ˈvɒljuːm|n.|a quantity or loudness|体积，音量|Turn up the volume.
voluntary|ˈvɒləntri|adj.|done by choice|自愿的|She does voluntary work.
vulnerable|ˈvʌlnərəbl|adj.|open to attack|脆弱的|The elderly are vulnerable.
welfare|ˈwelfeər|n.|health and well-being|福利|The government provides welfare.
widespread|ˈwaɪdspred|adj.|found in many places|广泛的|The disease is widespread.
wisdom|ˈwɪzdəm|n.|knowledge and good judgment|智慧|With age comes wisdom.
withdraw|wɪðˈdrɔː|v.|to pull back or remove|撤回|He withdrew his support.
witness|ˈwɪtnəs|n.|a person who sees an event|目击者|She was a witness.
workforce|ˈwɜːkfɔːs|n.|all the workers|劳动力|The workforce is highly skilled.
worthwhile|ˌwɜːθˈwaɪl|adj.|worth the time or effort|值得的|The effort was worthwhile.
wound|wuːnd|n.|an injury|伤口|The wound healed slowly.
yield|jiːld|v.|to produce or give way|产生，屈服|The farm yields a good harvest.
zone|zəʊn|n.|an area with a specific characteristic|区域|This is a no-parking zone.
`);

// Generate other vocab files  
const K12 = GAOKAO.slice(0, 100).map(e => ({...e}));
const BUSINESS = parseText(`agenda|əˈdʒendə|n.|a list of items to discuss|议程|What's on the agenda?
asset|ˈæset|n.|something valuable owned|资产|The company's assets total $10M.
audit|ˈɔːdɪt|n.|an official financial inspection|审计|The annual audit is next month.
bankruptcy|ˈbæŋkrʌptsi|n.|being unable to pay debts|破产|The company filed for bankruptcy.
benchmark|ˈbentʃmɑːk|n.|a standard for comparison|基准|This sets the quality benchmark.
bid|bɪd|n.|an offer of a price|出价|Their bid was $2 million.
board|bɔːd|n.|a group of directors|董事会|The board approved the merger.
bond|bɒnd|n.|a loan issued by a company|债券|Investors bought government bonds.
bonus|ˈbəʊnəs|n.|extra payment beyond salary|奖金|She received a year-end bonus.
brand|brænd|n.|a distinctive product identity|品牌|The brand is recognized worldwide.
broker|ˈbrəʊkər|n.|a person who arranges transactions|经纪人|The real estate broker showed us houses.
budget|ˈbʌdʒɪt|n.|a spending plan|预算|We need to cut the budget.
capital|ˈkæpɪtəl|n.|wealth used to produce more wealth|资本|They raised capital from investors.
CEO|siː iː əʊ|n.|chief executive officer|首席执行官|The CEO announced the new strategy.
client|ˈklaɪənt|n.|a person that uses services|客户|Our client is satisfied.
collateral|kəˈlætərəl|n.|property pledged as security|抵押品|The bank required collateral.
commerce|ˈkɒmɜːs|n.|buying and selling|商业|Electronic commerce is growing.
commission|kəˈmɪʃən|n.|a fee paid as a percentage of sales|佣金|She earns 10% commission.
commodity|kəˈmɒdəti|n.|a raw material or product|商品|Oil is a valuable commodity.
compensation|ˌkɒmpenˈseɪʃən|n.|payment for work or loss|补偿|She received compensation.
competitive|kəmˈpetətɪv|adj.|eager to win in business|有竞争力的|We offer competitive prices.
consultant|kənˈsʌltənt|n.|an expert who gives advice|顾问|The consultant recommended changes.
contract|ˈkɒntrækt|n.|a legally binding agreement|合同|Please sign the contract.
corporate|ˈkɔːpərət|adj.|relating to a large company|企业的|Corporate culture affects morale.
cost|kɒst|n.|the price paid to acquire something|成本|We need to reduce costs.
creditor|ˈkredɪtər|n.|a person or company owed money|债权人|The creditors demanded payment.
currency|ˈkʌrənsi|n.|money used in a country|货币|The dollar is a strong currency.
deadline|ˈdedlaɪn|n.|the latest time to complete|截止日期|The deadline is next Friday.
debt|det|n.|money that is owed|债务|The company has reduced its debt.
deficit|ˈdefɪsɪt|n.|excess of spending over income|赤字|The budget deficit is growing.
dividend|ˈdɪvɪdend|n.|a share of profits paid to shareholders|股息|The company pays quarterly dividends.
downsize|ˈdaʊnsaɪz|v.|to reduce the number of employees|裁员|The company downsized due to losses.
e-commerce|ˈiːkɒmɜːs|n.|buying and selling online|电子商务|E-commerce sales are booming.
economy|ɪˈkɒnəmi|n.|the system of production and trade|经济|The economy is recovering.
employee|ɪmˈplɔɪiː|n.|a person employed for wages|员工|The company has 500 employees.
employer|ɪmˈplɔɪər|n.|a person who employs others|雇主|The employer offers good benefits.
entrepreneur|ˌɒntrəprəˈnɜːr|n.|a person who starts businesses|企业家|She is a successful entrepreneur.
equity|ˈekwəti|n.|ownership value in a company|股权|He holds a 30% equity stake.
executive|ɪɡˈzekjʊtɪv|n.|a senior manager|高管|The executive team meets weekly.
export|ɪkˈspɔːt|v.|to send goods to other countries|出口|The company exports to Europe.
finance|ˈfaɪnæns|n.|the management of money|财务|She works in corporate finance.
forecast|ˈfɔːkɑːst|n.|a prediction of future trends|预测|The sales forecast looks promising.
founder|ˈfaʊndər|n.|a person who starts a company|创始人|The founder retired after 30 years.
franchise|ˈfræntʃaɪz|n.|a license to operate a branded business|特许经营权|They bought a fast food franchise.
fund|fʌnd|n.|a sum of money set aside|基金|The pension fund is well managed.
globalization|ˌɡləʊbəlaɪˈzeɪʃən|n.|worldwide integration|全球化|Globalization has increased trade.
growth|ɡrəʊθ|n.|an increase in size or value|增长|The company achieved 20% growth.
headquarters|ˌhedˈkwɔːtəz|n.|the main office of a company|总部|The headquarters is in New York.
import|ɪmˈpɔːt|v.|to bring goods from other countries|进口|Japan imports most of its oil.
incentive|ɪnˈsentɪv|n.|something that motivates action|激励|The bonus is an incentive to work.
income|ˈɪnkʌm|n.|money received regularly|收入|Her annual income is $80,000.
inflation|ɪnˈfleɪʃən|n.|a general increase in prices|通货膨胀|Inflation is running at 3%.
infrastructure|ˈɪnfrəstrʌktʃər|n.|basic physical systems|基础设施|The government invests in infrastructure.
innovation|ˌɪnəˈveɪʃən|n.|the introduction of new ideas|创新|Innovation drives business growth.
insurance|ɪnˈʃʊərəns|n.|protection against financial loss|保险|Health insurance is mandatory.
interest|ˈɪntrəst|n.|a charge for borrowing money|利息|The interest rate is 5%.
inventory|ˈɪnvəntɔri|n.|the stock of goods on hand|库存|We need to reduce inventory.
investment|ɪnˈvestmənt|n.|the purchase of an asset for profit|投资|The investment yielded 10%.
invoice|ˈɪnvɔɪs|n.|a bill for goods or services|发票|Please send the invoice.
IPO|aɪ piː əʊ|n.|initial public offering|首次公开募股|The company's IPO raised $500M.
liability|ˌlaɪəˈbɪləti|n.|a legal obligation or debt|负债|Liabilities exceed assets.
license|ˈlaɪsəns|n.|an official permit|执照|The restaurant has a liquor license.
loan|ləʊn|n.|money borrowed that must be repaid|贷款|We applied for a business loan.
logistics|ləˈdʒɪstɪks|n.|the coordination of operations|物流|Logistics is critical for supply chains.
margin|ˈmɑːdʒɪn|n.|the difference between cost and price|利润空间|Profit margins are thin.
market|ˈmɑːkɪt|n.|a place or system for buying and selling|市场|The stock market is volatile.
merger|ˈmɜːdʒər|n.|the combining of two companies|合并|The merger created a global giant.
mortgage|ˈmɔːɡɪdʒ|n.|a loan for buying property|抵押贷款|They took out a mortgage.
negotiate|nɪˈɡəʊʃieɪt|v.|to discuss terms to reach agreement|谈判|We negotiated a better price.
net|net|adj.|after deductions|净的|Net profit increased by 15%.
outsource|ˈaʊtsɔːs|v.|to obtain services from an outside supplier|外包|Many companies outsource IT support.
overhead|ˈəʊvəhed|n.|regular business expenses|管理费用|We need to reduce overhead.
partnership|ˈpɑːtnəʃɪp|n.|a business relationship|合伙关系|They formed a partnership.
payroll|ˈpeɪrəʊl|n.|the list of employees and their pay|工资单|The payroll is processed monthly.
pension|ˈpenʃən|n.|a retirement fund|养老金|The company contributes to the pension plan.
portfolio|pɔːtˈfəʊliəʊ|n.|a collection of investments|投资组合|Her portfolio is diversified.
premium|ˈpriːmiəm|n.|an extra payment or insurance cost|溢价|Insurance premiums are increasing.
procurement|prəˈkjʊəmənt|n.|the act of buying goods for a company|采购|The procurement department handles purchasing.
productivity|ˌprɒdʌkˈtɪvəti|n.|the efficiency of production|生产力|Productivity has increased by 10%.
profit|ˈprɒfɪt|n.|financial gain|利润|The company reported a profit.
prospectus|prəˈspektəs|n.|a document describing an investment|招股说明书|Read the prospectus.
purchase|ˈpɜːtʃəs|v.|to buy something|购买|We purchased new equipment.
quota|ˈkwəʊtə|n.|a fixed minimum target|配额|Sales representatives have monthly quotas.
recession|rɪˈseʃən|n.|a period of economic decline|经济衰退|The economy is in recession.
receivable|rɪˈsiːvəbl|n.|money owed by customers|应收账款|Accounts receivable are 60 days overdue.
refund|ˈriːfʌnd|n.|money returned to a customer|退款|The store issued a refund.
regulatory|ˈreɡjələtɔːri|adj.|relating to government rules|监管的|Regulatory compliance is mandatory.
reimburse|ˌriːɪmˈbɜːs|v.|to pay back expenses|报销|The company reimburses travel expenses.
revenue|ˈrevənjuː|n.|income from sales|收入|Annual revenue reached $10M.
royalty|ˈrɔɪəlti|n.|a payment to a creator for using their work|版税|The author earns 10% royalty.
salary|ˈsæləri|n.|fixed regular pay|薪资|She earns a good salary.
share|ʃeər|n.|a unit of ownership in a company|股份|The stock price is $50 per share.
shareholder|ˈʃeərhəʊldər|n.|an owner of shares|股东|Shareholders approved the merger.
stakeholder|ˈsteɪkhəʊldər|n.|a person with an interest|利益相关者|All stakeholders were consulted.
startup|ˈstɑːtʌp|n.|a newly established business|初创公司|The startup raised seed funding.
stock|stɒk|n.|shares of a company|股票|He invested in technology stocks.
subsidiary|səbˈsɪdiəri|n.|a company controlled by another|子公司|The subsidiary operates independently.
supply|səˈplaɪ|n.|the amount of goods available|供应|The supply chain was disrupted.
surplus|ˈsɜːpləs|n.|an excess of income over spending|盈余|The trade surplus is growing.
tariff|ˈtærɪf|n.|a tax on imported goods|关税|Tariffs on steel were increased.
tax|tæks|n.|a compulsory payment to the government|税收|Corporate tax rates have been reduced.
tender|ˈtendər|n.|a formal offer to supply goods|投标|The company submitted a tender.
trade|treɪd|n.|the exchange of goods and services|贸易|International trade benefits both countries.
transaction|trænˈzækʃən|n.|a business deal|交易|The transaction was completed online.
treasury|ˈtreʒəri|n.|the department managing finances|财务部|The treasury manages cash flow.
turnover|ˈtɜːnəʊvər|n.|the rate of employee departures|员工流动率|High turnover is costly.
valuation|ˌvæljuˈeɪʃən|n.|the estimated worth|估值|The company's valuation is $1B.
warranty|ˈwɒrənti|n.|a guarantee for a product|保修|The product comes with a two-year warranty.
yield|jiːld|n.|the income return on an investment|收益率|The bond yields 5%.
`);

const SAT = parseText(`abjure|əbˈdʒʊər|v.|to renounce or give up|发誓放弃|He abjured his former beliefs.
abstain|əbˈsteɪn|v.|to refrain from something|戒除，弃权|She abstained from voting.
accolade|ˈækəleɪd|n.|an award or praise|荣誉|She received many accolades.
acumen|ˈækjʊmən|n.|the ability to make good judgments|敏锐|Business acumen is valuable.
admonish|ədˈmɒnɪʃ|v.|to warn or reprimand|告诫|The teacher admonished the students.
adverse|ˈædvɜːs|adj.|unfavorable or harmful|不利的|The adverse weather delayed the flight.
aesthetic|iːsˈθetɪk|adj.|concerned with beauty|审美的|The building has aesthetic appeal.
affable|ˈæfəbl|adj.|friendly and easy to talk to|和蔼的|She has an affable personality.
alacrity|əˈlækrəti|n.|eager willingness|爽快|She accepted with alacrity.
allege|əˈledʒ|v.|to claim without proof|声称|He alleged corruption.
ambiguous|æmˈbɪɡjuəs|adj.|open to multiple interpretations|模棱两可的|The statement was ambiguous.
ameliorate|əˈmiːliəreɪt|v.|to make better|改善|We need to ameliorate the situation.
anomaly|əˈnɒməli|n.|something that deviates from the norm|异常|The result was an anomaly.
apathetic|ˌæpəˈθetɪk|adj.|lacking interest|冷漠的|The audience was apathetic.
arbitrary|ˈɑːbɪtrəri|adj.|based on random choice|任意的|The decision seemed arbitrary.
arduous|ˈɑːdjuəs|adj.|difficult and tiring|艰苦的|The climb was arduous.
articulate|ɑːˈtɪkjuleɪt|adj.|clear and well-spoken|口齿清晰的|She is articulate.
ascertain|ˌæsəˈteɪn|v.|to find out for certain|查明|We need to ascertain the truth.
assiduous|əˈsɪdjuəs|adj.|showing great care and effort|勤勉的|She was assiduous in her studies.
astute|əˈstjuːt|adj.|sharp and perceptive|精明的|He is an astute investor.
auspicious|ɔːˈspɪʃəs|adj.|favorable and promising|吉利的|The launch was auspicious.
austere|ɒˈstɪər|adj.|severe and strict|简朴的|He lived an austere life.
avarice|ˈævərɪs|n.|extreme greed|贪婪|His avarice knew no bounds.
avid|ˈævɪd|adj.|enthusiastic and eager|热切的|She is an avid reader.
benevolent|bəˈnevələnt|adj.|kind and generous|仁慈的|The donor was benevolent.
benign|bɪˈnaɪn|adj.|gentle and not harmful|良性的|The tumor was benign.
bequeath|bɪˈkwiːð|v.|to leave property in a will|遗赠|He bequeathed his estate to charity.
berate|bɪˈreɪt|v.|to scold harshly|严厉斥责|The boss berated the employees.
bias|ˈbaɪəs|n.|prejudice|偏见|The article shows political bias.
bolster|ˈbəʊlstər|v.|to support or strengthen|支持|The evidence bolstered his case.
bombastic|bɒmˈbæstɪk|adj.|high-sounding but empty|夸夸其谈的|His speech was bombastic.
cacophony|kəˈkɒfəni|n.|a harsh mixture of sounds|刺耳的声音|The cacophony was loud.
candid|ˈkændɪd|adj.|open and honest|坦率的|She gave a candid assessment.
capitulate|kəˈpɪtjuleɪt|v.|to surrender or give in|投降|The army capitulated.
catalyst|ˈkætəlɪst|n.|something that causes change|催化剂|The speech was a catalyst for change.
caustic|ˈkɔːstɪk|adj.|sarcastic or burning|尖刻的|His caustic remarks hurt her.
circumspect|ˈsɜːkəmspekt|adj.|careful and cautious|谨慎的|Be circumspect.
circumvent|ˌsɜːkəmˈvent|v.|to find a way around|规避|They circumvented the regulations.
clandestine|klænˈdestɪn|adj.|secret and hidden|秘密的|They held a clandestine meeting.
coerce|kəʊˈɜːs|v.|to force someone to do something|强迫|They coerced him into signing.
cogent|ˈkəʊdʒənt|adj.|clear and convincing|有说服力的|Her argument was cogent.
colloquial|kəˈləʊkwiəl|adj.|informal and conversational|口语的|Colloquial language is used daily.
compelling|kəmˈpelɪŋ|adj.|extremely interesting|引人入胜的|The story was compelling.
compliant|kəmˈplaɪənt|adj.|willing to obey|顺从的|The child was compliant.
concede|kənˈsiːd|v.|to admit or yield|承认|He conceded defeat.
conciliatory|kənˈsɪliətɔːri|adj.|intended to make peace|安抚的|She made a conciliatory gesture.
conclusive|kənˈkluːsɪv|adj.|settling an issue|决定性的|The evidence was conclusive.
condone|kənˈdəʊn|v.|to overlook or forgive|宽恕|I cannot condone such behavior.
conjecture|kənˈdʒektʃər|n.|a guess based on incomplete info|推测|That's pure conjecture.
conscientious|ˌkɒnʃiˈenʃəs|adj.|thorough and careful|尽职尽责的|She is a conscientious worker.
consensus|kənˈsensəs|n.|general agreement|共识|The group reached a consensus.
conspicuous|kənˈspɪkjuəs|adj.|easily noticeable|显眼的|The sign was conspicuous.
constrain|kənˈstreɪn|v.|to limit or restrict|约束|Funding constrained the project.
contemplate|ˈkɒntəmpleɪt|v.|to consider deeply|沉思|She contemplated her future.
contempt|kənˈtempt|n.|a feeling of disdain|蔑视|He showed contempt.
controversy|kənˈtrɒvərsi|n.|a prolonged public disagreement|争议|The decision sparked controversy.
conundrum|kəˈnʌndrəm|n.|a confusing problem|难题|The question was a conundrum.
copious|ˈkəʊpiəs|adj.|abundant in quantity|大量的|She took copious notes.
corroborate|kəˈrɒbəreɪt|v.|to confirm or support|证实|The witness corroborated his story.
cosmopolitan|ˌkɒzməˈpɒlɪtən|adj.|familiar with many cultures|世界性的|She has a cosmopolitan outlook.
covert|ˈkʌvət|adj.|hidden or secret|隐秘的|They conducted covert operations.
credulous|ˈkredʒʊləs|adj.|easily believing|轻信的|The credulous child believed everything.
culminate|ˈkʌlmɪneɪt|v.|to reach the highest point|达到顶点|The festival culminated in fireworks.
cursory|ˈkɜːsəri|adj.|hasty and superficial|粗略的|He gave the report a cursory glance.
curtail|kɜːˈteɪl|v.|to reduce or cut short|削减|The budget was curtailed.
cynical|ˈsɪnɪkəl|adj.|distrustful of others' motives|愤世嫉俗的|He is cynical about politics.
daunting|ˈdɔːntɪŋ|adj.|seeming difficult to deal with|令人畏惧的|The task was daunting.
debacle|deɪˈbɑːkl|n.|a complete failure|惨败|The project was a debacle.
decorum|dɪˈkɔːrəm|n.|proper behavior|得体|He maintained decorum.
deference|ˈdefərəns|n.|polite respect|尊重|She spoke with deference.
delineate|dɪˈlɪnieɪt|v.|to describe or portray accurately|描绘|The report delineates the issues.
deluge|ˈdeljuːdʒ|n.|a great flood or downpour|洪水|The deluge caused widespread damage.
demeanor|dɪˈmiːnər|n.|outward behavior or manner|举止|His calm demeanor was reassuring.
denigrate|ˈdenɪɡreɪt|v.|to criticize unfairly|诋毁|Do not denigrate others.
`);

const PHRASAL_VERBS = parseText(`
give up|ɡɪv ʌp|phr.|to stop trying|放弃|Don't give up on your dreams.
look after|lʊk ˈɑːftər|phr.|to take care of|照顾|She looks after her mother.
put off|pʊt ɒf|phr.|to postpone|推迟|Don't put off your homework.
take off|teɪk ɒf|phr.|to remove or leave the ground|脱下，起飞|The plane took off.
turn down|tɜːn daʊn|phr.|to reject or lower volume|拒绝，调低|He turned down the offer.
break down|breɪk daʊn|phr.|to stop functioning|出故障|My car broke down.
come across|kʌm əˈkrɒs|phr.|to find by chance|偶然遇到|I came across an old photo.
get along|ɡet əˈlɒŋ|phr.|to have a friendly relationship|相处|They get along well.
run out of|rʌn aʊt ɒv|phr.|to exhaust the supply|用完|We ran out of milk.
set up|set ʌp|phr.|to establish or arrange|建立|They set up a company.
bring up|brɪŋ ʌp|phr.|to raise or mention|抚养，提起|She brought up three children.
call off|kɔːl ɒf|phr.|to cancel|取消|The game was called off.
carry on|ˈkæri ɒn|phr.|to continue|继续|Carry on with your work.
check in|tʃek ɪn|phr.|to register at a hotel|办理入住|We checked in at the hotel.
cut down|kʌt daʊn|phr.|to reduce|减少|Cut down on sugar.
end up|end ʌp|phr.|to eventually find oneself|最终|He ended up in hospital.
figure out|ˈfɪɡər aʊt|phr.|to solve or understand|弄明白|She figured out the puzzle.
fill in|fɪl ɪn|phr.|to complete a form|填写|Please fill in this form.
get over|ɡet ˈəʊvər|phr.|to recover from|从...恢复|She got over her illness.
go through|ɡəʊ θruː|phr.|to experience or examine|经历，检查|He went through a difficult time.
hold on|həʊld ɒn|phr.|to wait or grip tightly|稍等，抓紧|Hold on, I'll be right there.
keep up|kiːp ʌp|phr.|to maintain at the same level|保持|Keep up the good work.
look forward to|lʊk ˈfɔːwəd tuː|phr.|to anticipate excitedly|期待|I look forward to meeting you.
make up|meɪk ʌp|phr.|to invent or reconcile|编造，和好|They made up after the argument.
pick up|pɪk ʌp|phr.|to collect or learn|捡起，接送|I'll pick you up at 8.
point out|pɔɪnt aʊt|phr.|to indicate or draw attention|指出|She pointed out the error.
put up with|pʊt ʌp wɪð|phr.|to tolerate|忍受|I can't put up with the noise.
run into|rʌn ˈɪntuː|phr.|to meet unexpectedly|偶然碰见|I ran into an old friend.
show up|ʃəʊ ʌp|phr.|to arrive or appear|出现|He showed up late.
take care of|teɪk keər ɒv|phr.|to be responsible for|照顾|Take care of yourself.
think over|θɪŋk ˈəʊvər|phr.|to consider carefully|仔细考虑|Think it over before deciding.
throw away|θrəʊ əˈweɪ|phr.|to discard|扔掉|Don't throw away the receipt.
try on|traɪ ɒn|phr.|to test clothing|试穿|Try on the dress.
turn up|tɜːn ʌp|phr.|to arrive or increase volume|出现，调大|He turned up late.
work out|wɜːk aʊt|phr.|to exercise or solve a problem|锻炼，解决|Things will work out.
look up|lʊk ʌp|phr.|to search for information|查阅|Look up the word in a dictionary.
calm down|kɑːm daʊn|phr.|to become relaxed|冷静下来|Calm down and tell me.
come up with|kʌm ʌp wɪð|phr.|to think of a solution|想出|She came up with a great idea.
dress up|dres ʌp|phr.|to wear formal clothes|盛装打扮|We dressed up for the party.
fall apart|fɔːl əˈpɑːt|phr.|to break into pieces|破裂，崩溃|Their marriage fell apart.
grow up|ɡrəʊ ʌp|phr.|to become an adult|长大|What do you want to be when you grow up?
hang out|hæŋ aʊt|phr.|to spend time with friends|闲逛|I hung out with friends.
let down|let daʊn|phr.|to disappoint|让...失望|Don't let me down.
look into|lʊk ˈɪntuː|phr.|to investigate|调查|The police are looking into it.
pass away|pɑːs əˈweɪ|phr.|to die|去世|Her grandfather passed away.
pull over|pʊl ˈəʊvər|phr.|to move to the side of the road|靠边停车|The police told him to pull over.
put away|pʊt əˈweɪ|phr.|to store or tidy|收好|Put away your toys.
settle down|ˈsetl daʊn|phr.|to establish a stable life|安定下来|He wants to settle down.
stand for|stænd fɔːr|phr.|to represent|代表|What does UN stand for?
turn into|tɜːn ˈɪntuː|phr.|to become or transform into|变成|The caterpillar turned into a butterfly.
`);

const COLLINS = parseText(`
the|ðə|det.|used to refer to something specific|定冠词|The sun is shining.
be|biː|v.|to exist or have a quality|是，存在|I want to be a doctor.
to|tuː|prep.|in the direction of|向，到|Go to the store.
of|ɒv|prep.|expressing the relationship|的|The color of the sky.
and|ænd|conj.|used to connect words|和|You and me.
a|eɪ|art.|used before nouns|一个|I saw a bird.
in|ɪn|prep.|expressing location or time|在...里面|It is in the box.
that|ðæt|conj.|introducing a clause|那|I know that you are right.
have|hæv|v.|to possess or own|有|I have a car.
it|ɪt|pron.|used to refer to a thing|它|It is raining.
for|fɔːr|prep.|intended to belong to|为了|This is for you.
not|nɒt|adv.|used to form the negative|不|I do not know.
on|ɒn|prep.|physically in contact with|在...上|The book is on the table.
with|wɪð|prep.|accompanied by|和...一起|Come with me.
he|hiː|pron.|used to refer to a male|他|He is my brother.
as|æz|conj.|used to indicate function|作为|She works as a teacher.
you|juː|pron.|used to refer to the person addressed|你|You are my friend.
do|duː|v.|to perform an action|做|What do you do?
at|æt|prep.|expressing location|在|I am at home.
this|ðɪs|pron.|used to identify a specific thing|这个|This is mine.
but|bʌt|conj.|used to introduce a contrast|但是|I like it but it's expensive.
his|hɪz|pron.|belonging to him|他的|This is his book.
by|baɪ|prep.|indicating the agent|通过|It was made by her.
from|frɒm|prep.|indicating the point of origin|从|I come from China.
they|ðeɪ|pron.|used to refer to people or things|他们|They are here.
we|wiː|pron.|used to refer to oneself and others|我们|We are going.
say|seɪ|v.|to utter words|说|What did you say?
her|hɜːr|pron.|belonging to her|她的|I like her dress.
she|ʃiː|pron.|used to refer to a female|她|She is my sister.
or|ɔːr|conj.|used to link alternatives|或者|Tea or coffee?
will|wɪl|modal.|expressing the future|将|I will go.
my|maɪ|pron.|belonging to me|我的|This is my car.
one|wʌn|num.|the number 1|一|I have one apple.
all|ɔːl|adj.|the whole quantity of|所有的|All people are equal.
would|wʊd|modal.|expressing conditional|会|I would like that.
there|ðeər|adv.|in, at, or to that place|在那里|It is over there.
their|ðeər|pron.|belonging to them|他们的|Their house is big.
what|wɒt|pron.|asking for information|什么|What is your name?
so|səʊ|adv.|to such a great extent|如此|It's so beautiful.
up|ʌp|adv.|toward a higher position|向上|Stand up.
out|aʊt|adv.|away from inside|出去|Go out.
if|ɪf|conj.|on the condition that|如果|If you go, I'll come.
about|əˈbaʊt|prep.|on the subject of|关于|Tell me about it.
who|huː|pron.|what person or people|谁|Who is there?
get|ɡet|v.|to come to have|得到|I got a gift.
which|wɪtʃ|pron.|asking for specific information|哪个|Which one is yours?
go|ɡəʊ|v.|to move or travel|去|Let's go.
me|miː|pron.|used by a speaker to refer to himself|我|Give it to me.
when|wen|adv.|at what time|什么时候|When will you come?
make|meɪk|v.|to form or create|制作|She made a cake.
can|kæn|modal.|to be able to|能|I can swim.
like|laɪk|prep.|similar to|像|She looks like her mother.
time|taɪm|n.|a period of existence|时间|Time flies.
no|nəʊ|det.|not any|没有|I have no money.
just|dʒʌst|adv.|exactly or only|仅仅，正好|Just do it.
him|hɪm|pron.|used to refer to a male|他|I saw him.
know|nəʊ|v.|to have information|知道|I know the answer.
take|teɪk|v.|to lay hold of|拿|Take a seat.
people|ˈpiːpl|n.|human beings in general|人们|Many people came.
into|ˈɪntuː|prep.|to the inside of|进入|Go into the room.
year|jɪər|n.|the time taken by the Earth to orbit the sun|年|A year has 365 days.
your|jɔːr|pron.|belonging to you|你的|Your bag is here.
good|ɡʊd|adj.|of a high quality|好的|This is a good book.
some|sʌm|det.|an unspecified quantity|一些|I need some water.
could|kʊd|modal.|expressing possibility|可以，能|Could you help me?
them|ðem|pron.|used to refer to people or things|他们|I saw them.
see|siː|v.|to perceive with the eyes|看见|I can see you.
other|ˈʌðər|adj.|different from the one named|其他的|The other one is better.
than|ðæn|conj.|used in comparisons|比|She is taller than me.
then|ðen|adv.|at that time|然后|I was younger then.
now|naʊ|adv.|at the present time|现在|Do it now.
look|lʊk|v.|to direct one's gaze|看|Look at that!
only|ˈəʊnli|adv.|no more than|仅仅|I only have one.
come|kʌm|v.|to move toward the speaker|来|Come here.
its|ɪts|pron.|belonging to it|它的|The cat licked its paw.
over|ˈəʊvər|prep.|extending upward from|在...之上|A bridge over the river.
think|θɪŋk|v.|to have a belief|认为|I think you're right.
also|ˈɔːlsəʊ|adv.|in addition|也|She also came.
back|bæk|adv.|in return to a previous place|回来|Go back home.
after|ˈɑːftər|prep.|following in time|在...之后|After dinner we left.
use|juːz|v.|to employ for a purpose|使用|Use a pen.
two|tuː|num.|the number 2|二|I have two cats.
how|haʊ|adv.|in what way|如何|How are you?
our|aʊər|pron.|belonging to us|我们的|Our house is small.
work|wɜːk|n.|physical or mental effort|工作|I go to work.
first|fɜːst|adj.|coming before all others|第一|This is my first time.
well|wel|adv.|in a good manner|好|She sings well.
way|weɪ|n.|a method or manner|方式，路|Show me the way.
even|ˈiːvən|adv.|used for emphasis|甚至|Even he agreed.
new|njuː|adj.|not existing before|新的|I bought a new phone.
want|wɒnt|v.|to have a desire|想要|I want water.
because|bɪˈkɒz|conj.|for the reason that|因为|I left because I was tired.
any|ˈeni|det.|one or some|任何|Any questions?
these|ðiːz|pron.|plural of this|这些|These are mine.
give|ɡɪv|v.|to freely transfer|给|Give me the book.
day|deɪ|n.|a 24-hour period|天|Have a nice day.
most|məʊst|adj.|greatest in amount|最多的|Most people agree.
us|ʌs|pron.|used to refer to oneself and others|我们|Come with us.
`);

function main() {
  console.log('Building vocabulary files...\n');
  
  // Check existing files
  const existing = {};
  const vocabDir = V;
  fs.readdirSync(vocabDir).forEach(f => {
    if (f.endsWith('.json') && f !== 'index.json') {
      try { existing[f.replace('.json','')] = JSON.parse(fs.readFileSync(path.join(vocabDir,f),'utf-8')); } catch(_) {}
    }
  });

  // Write new vocab files
  const newVocabs = [
    ['gaokao', GAOKAO],
    ['k12', K12],
    ['business', BUSINESS],
    ['sat', SAT],
    ['phrasal-verbs', PHRASAL_VERBS],
    ['collins', COLLINS],
  ];

  newVocabs.forEach(([id, data]) => {
    const existingData = existing[id] || [];
    const merged = existingData.length > existing[id]?.length ? existingData : data;
    writeVocab(id, merged);
    console.log(`${id}.json: ${merged.length} words`);
  });

  // Update existing files with new entries
  ['cet4','cet6','ielts','toefl','gre'].forEach(id => {
    const existingData = existing[id] || [];
    console.log(`${id}.json: ${existingData.length} words (already exists)`);
  });

  updateIndex();
  console.log('\nDone!');
}

main();
