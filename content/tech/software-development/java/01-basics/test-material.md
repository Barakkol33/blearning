---
title: החומר למבחן - Java בסיסי
tags: [java, מבחן]
related: []
attachments: []
updated: 2026-11-21
---

# החומר למבחן - Java בסיסי

כל החומר למבחן בסיסי ב-Java בעמוד אחד: מושגי יסוד, מבנה תוכנית, הדפסות, משתנים וטיפוסים, פעולות חשבון, המרות, קלט, תנאים, תווים ומחרוזות, Math ומספרים אקראיים. בסוף העמוד יש רשימת מלכודות נפוצות ודף עזר מקוצר.

> **שימו לב:** הדוגמאות בעמוד נבדקו בהרצה, אבל ייתכנו טעויות. אם משהו לא ברור או סותר את מה שלמדתם, בדקו מול חומר הלימוד או המורה, ואל תסתמכו רק על העמוד הזה. מצאתם טעות? כתבו ל-blearning033@gmail.com.

**לתרגול:** [Java בסיסי ב-quizplay](https://barakkol33.github.io/quizplay/#/p/java-basics): שאלות "מה יודפס?", שאלות טווחים, השלמת קוד, וכתיבת קוד והרצה אמיתית בדפדפן.

---

## ‏1. מושגי יסוד

### המחשב: קלט, עיבוד, פלט

כל מחשב, מטלפון ועד שרת, עובד באותו מבנה:

- **קלט**: נתונים שנכנסים: מקלדת, עכבר, מיקרופון, מצלמה, חיישן.
- **עיבוד**: המעבד מבצע את ההוראות של התוכנית על הנתונים.
- **פלט**: התוצאה יוצאת: מסך, מדפסת, רמקול.
- יש התקנים שהם גם וגם, למשל מסך מגע.

### חומרה ותוכנה

- **חומרה**: החלקים הפיזיים: מעבד, זיכרון, דיסק, מסך.
- **תוכנה**: התוכניות שרצות על החומרה: מערכת הפעלה, דפדפן, משחק, והתוכניות שאנחנו כותבים.
- **מעבד (CPU)**: מבצע את ההוראות, אחת אחרי השנייה, מהר מאוד.
- **זיכרון ראשי (RAM)**: מהיר, ומחזיק את התוכנית שרצה ואת המשתנים שלה. נמחק כשהמחשב כבה.
- **זיכרון משני (דיסק, SSD)**: איטי יותר, ושומר קבצים גם כשהמחשב כבוי.

### משפת תכנות לשפת מכונה

- המעבד מבין רק **שפת מכונה**: הוראות בינאריות, אפסים ואחדות.
- אנחנו כותבים ב**שפה עילית** כמו Java, שקל לבני אדם לקרוא.
- **מהדר (קומפיילר)** בודק שהקוד כתוב לפי חוקי השפה ומתרגם אותו.

ב-Java זה עובד כך:

1. כותבים **קוד מקור** בקובץ `Main.java`.
2. המהדר (`javac`) מתרגם אותו ל-**bytecode**, בקובץ `Main.class`.
3. **המכונה הווירטואלית של Java (JVM)** מריצה את ה-bytecode. בגלל זה אותה תוכנית רצה על Windows, Mac ו-Linux.

### שלושה סוגי שגיאות

| סוג | מתי מתגלה | דוגמה |
|---|---|---|
| שגיאת קומפילציה (תחביר) | המהדר מסרב לתרגם | חסר `;`, טעות בשם, `int x = 3.5;` |
| שגיאת זמן ריצה | התוכנית קורסת בזמן שהיא רצה | חילוק int באפס, אינדקס מחוץ למחרוזת |
| שגיאה לוגית | התוכנית רצה, אבל התוצאה לא נכונה | `7 / 2` במקום `7 / 2.0` בחישוב ממוצע |

---

## ‏2. מבנה של תוכנית

```java
public class Main {                          // מחלקה. שם הקובץ: Main.java
    public static void main(String[] args) { // כאן התוכנית מתחילה
        System.out.println("Hello");         // הוראה, נגמרת ב-;
    }
}
```

- התוכנית מתחילה תמיד בשיטה `main`.
- כל הוראה נגמרת ב-**נקודה-פסיק** `;`.
- **סוגריים מסולסלים** `{ }` פותחים וסוגרים בלוק: מחלקה, שיטה, if, לולאה.
- ‏Java **רגישה לאותיות גדולות וקטנות**: `System` נכון, `system` שגיאה.
- **הערות** לא מורצות: `//` עד סוף השורה, ו-`/* ... */` לכמה שורות.
- שם המחלקה הציבורית חייב להיות כמו שם הקובץ.

---

## ‏3. הדפסות

### ‏println ו-print

```java
System.out.println("Hello");  // מדפיס ויורד שורה
System.out.print("A");        // מדפיס ונשאר באותה שורה
System.out.print("B");
System.out.println();         // רק ירידת שורה
```

פלט:

```text
Hello
AB
```

### שרשור מחרוזות

הסימן `+` בין מספרים הוא **חיבור**. כשאחד הצדדים מחרוזת, הוא **שרשור** (הדבקה). Java מחשבת **משמאל לימין**:

```java
System.out.println(1 + 2 + "3");       // 33   (קודם 1+2=3, ואז "3"+"3")
System.out.println("1" + 2 + 3);       // 123  (מתחילים במחרוזת, הכול שרשור)
System.out.println("Sum: " + 2 + 3);   // Sum: 23
System.out.println("Sum: " + (2 + 3)); // Sum: 5  (הסוגריים קודם)
System.out.println(10 + 20 + "" + 10 + 20); // 301020
```

**כלל:** כשמדפיסים חישוב עם טקסט, שמים את החישוב בסוגריים.

### תווים מיוחדים

| כותבים | מקבלים |
|---|---|
| `\n` | שורה חדשה |
| `\t` | טאב |
| `\"` | גרשיים בתוך מחרוזת |
| `\\` | לוכסן הפוך |

```java
System.out.println("He said \"hi\"");  // He said "hi"
System.out.println("Line1\nLine2");      // שתי שורות
```

### תוספת: printf

הדפסה לפי תבנית. לא חובה, אבל שימושי:

```java
System.out.printf("%d + %d = %d%n", 2, 3, 5); // 2 + 3 = 5
System.out.printf("%.2f%n", 3.14159);         // 3.14
System.out.printf("Name: %s%n", "Dana");      // Name: Dana
```

‏`%d` מספר שלם, `%f` עשרוני (`%.2f` עם שתי ספרות), `%s` מחרוזת, `%n` ירידת שורה. printf **לא יורד שורה לבד**.

---

## ‏4. משתנים וטיפוסים

### הצהרה והשמה

```java
int age;          // הצהרה: יוצרים משתנה מטיפוס int
age = 16;         // השמה: שמים בו ערך
int year = 2026;  // הצהרה עם אתחול, בשורה אחת
age = age + 1;    // מחשבים את הצד הימני, ושמים בצד השמאלי: 17
```

אי אפשר להשתמש במשתנה לפני שנתנו לו ערך: זו שגיאת קומפילציה.

### הטיפוסים הפרימיטיביים

| טיפוס | מה שומר | גודל | דוגמה |
|---|---|---|---|
| `byte` | שלם קטן, -128 עד 127 | 1 בית | `byte b = 100;` |
| `short` | שלם, בערך ±32 אלף | 2 בתים | `short s = 30000;` |
| `int` | שלם, בערך ±2.1 מיליארד | 4 בתים | `int n = 42;` |
| `long` | שלם גדול מאוד | 8 בתים | `long big = 9000000000L;` |
| `float` | עשרוני, פחות מדויק | 4 בתים | `float f = 2.5f;` |
| `double` | עשרוני, מדויק יותר | 8 בתים | `double d = 2.5;` |
| `char` | תו אחד, בגרש בודד | 2 בתים | `char c = 'A';` |
| `boolean` | `true` או `false` | | `boolean ok = true;` |

- מספר שלם בקוד הוא `int`, ומספר עם נקודה הוא `double`.
- ‏**String** (מחרוזת) הוא לא טיפוס פרימיטיבי, אלא מחלקה: `String name = "Dana";` עם גרשיים כפולים.

### חוקי שמות

- מותר: אותיות, ספרות, קו תחתון `_` וסימן `$`.
- אסור להתחיל בספרה: `2nd` אסור, `second2` מותר.
- אסור רווחים, ואסור מילה שמורה (`int`, `class`, `if`...).
- ‏`age` ו-`Age` הם **שני משתנים שונים**.
- מקובל: משתנים ב-camelCase (`totalPrice`), מחלקות באות גדולה (`Main`), קבועים באותיות גדולות (`MAX_SCORE`).

### קבועים

```java
final int MAX_SCORE = 100;  // final: אי אפשר לשנות
MAX_SCORE = 90;             // שגיאת קומפילציה
```

---

## ‏5. פעולות חשבון

| פעולה | סימן | דוגמה | תוצאה |
|---|---|---|---|
| חיבור | `+` | `7 + 2` | `9` |
| חיסור | `-` | `7 - 2` | `5` |
| כפל | `*` | `7 * 2` | `14` |
| חילוק | `/` | `7 / 2` | `3` |
| שארית | `%` | `7 % 2` | `1` |

### חילוק שלמים

**חילוק בין שני int נותן int**: החלק העשרוני **נחתך** (לא מעוגל!).

```java
System.out.println(7 / 2);    // 3
System.out.println(7 / 2.0);  // 3.5  (אחד מהם double, אז התוצאה double)
System.out.println(1 / 3);    // 0
```

### שארית

```java
System.out.println(17 % 5);   // 2
System.out.println(4 % 7);    // 4   (קטן מהמחלק: השארית הוא המספר עצמו)
```

שימושים קבועים:

- זוגי? `n % 2 == 0`. מתחלק ב-3? `n % 3 == 0`.
- ספרת האחדות: `n % 10`. להוריד אותה: `n / 10`.
- שניות לדקות ושניות: `sec / 60` ו-`sec % 60`.

```java
int n = 1234;
System.out.println(n % 10 + " " + n / 10);  // 4 123
```

### סדר פעולות

`* / %` לפני `+ -`. באותה רמה: **משמאל לימין**. סוגריים קודם לכול.

```java
2 + 3 * 4     // 14
(2 + 3) * 4   // 20
20 / 4 * 2    // 10  (20/4=5, ואז 5*2)
10 - 4 - 3    // 3
```

### קיצורים

```java
x += 3;   // x = x + 3
x -= 2;   // x = x - 2
x *= 2;   // x = x * 2
x /= 4;   // x = x / 4
x++;      // x = x + 1
x--;      // x = x - 1
```

בתוך ביטוי, יש הבדל:

```java
int a = 5;
int b = a++;   // b = 5, ואז a = 6  (קודם משתמשים, אחר כך מגדילים)
int c = ++a;   // a = 7, ואז c = 7  (קודם מגדילים)
```

### חילוק באפס

```java
System.out.println(10 / 0);   // שגיאת זמן ריצה: ArithmeticException
```

---

## ‏6. המרות (casting)

### המרה אוטומטית (הרחבה)

מטיפוס קטן לגדול, בלי לאבד מידע, Java ממירה לבד:

```java
double d = 5;      // d = 5.0
long l = 100;      // תקין
```

### המרה מפורשת (צמצום)

מגדול לקטן צריך לכתוב את הטיפוס בסוגריים. **החלק העשרוני נחתך**:

```java
int x = 3.99;          // שגיאת קומפילציה
int x = (int) 3.99;    // x = 3  (חותך, לא מעגל)
```

### המלכודת הגדולה: מתי ההמרה קורית

ההמרה נצמדת **לערך שמיד אחריה**:

```java
double a = 7 / 2;            // 3.0  קודם חילוק שלמים (3), ואז 3 הופך ל-3.0
double b = (double) 7 / 2;   // 3.5  קודם 7 הופך ל-7.0, ואז חילוק עשרוני
double c = (double) (7 / 2); // 3.0  הסוגריים קודם: חילוק שלמים
double d = 7 / 2.0;          // 3.5
```

### ממוצע נכון

```java
int sum = 7 + 8 + 10;
System.out.println(sum / 3);          // 8                  (שגיאה לוגית!)
System.out.println(sum / 3.0);        // 8.333333333333334
System.out.println((double) sum / 3); // 8.333333333333334
```

---

## ‏7. קלט מהמשתמש

```java
import java.util.Scanner;              // בראש הקובץ

public class Main {
    public static void main(String[] args) {
        Scanner scan = new Scanner(System.in);
        System.out.print("Enter your age: ");
        int age = scan.nextInt();
        System.out.println("Next year you will be " + (age + 1));
    }
}
```

| שיטה | קוראת | דוגמה לקלט |
|---|---|---|
| `nextInt()` | מספר שלם | `17` |
| `nextDouble()` | מספר עשרוני | `3.5` |
| `next()` | מילה אחת, עד רווח | `Dana` |
| `nextLine()` | את כל השורה | `Dana Cohen` |

- אם המשתמש מקליד טקסט כש-`nextInt()` מחכה למספר: שגיאת זמן ריצה (InputMismatchException).
- **מלכודת:** `nextLine()` אחרי `nextInt()` מחזיר שורה ריקה, כי הוא קורא את סוף השורה שנשאר אחרי המספר. פתרון: לקרוא `nextLine()` נוסף לפני.

---

## ‏8. תנאים

### השוואות

| סימן | משמעות |
|---|---|
| `==` | שווה (שני סימנים! `=` הוא השמה) |
| `!=` | שונה |
| `<`, `>` | קטן, גדול |
| `<=`, `>=` | קטן או שווה, גדול או שווה |

התוצאה של השוואה היא `boolean`: `true` או `false`.

### ‏if ו-else

```java
int grade = 72;
if (grade >= 56) {
    System.out.println("Passed");
} else {
    System.out.println("Failed");
}
```

### שרשרת else if

נבדק תנאי אחרי תנאי, ורק **הראשון שמתקיים** מבוצע:

```java
if (grade >= 90) {
    System.out.println("A");
} else if (grade >= 80) {
    System.out.println("B");
} else if (grade >= 56) {
    System.out.println("C");
} else {
    System.out.println("F");
}
```

עם `grade = 95` יודפס רק `A`, למרות ש-95 גם גדול מ-80.

### אופרטורים לוגיים

| סימן | שם | אמת כאשר |
|---|---|---|
| `&&` | וגם | שני הצדדים אמת |
| `\|\|` | או | לפחות צד אחד אמת |
| `!` | לא | הפוך: `!true` הוא `false` |

```java
int age = 15;
boolean teen = age >= 13 && age <= 19;   // true
boolean weekend = day == 6 || day == 7;
if (!(x > 0)) { ... }                    // אם x לא חיובי
```

- **קדימות:** `!` לפני `&&`, ו-`&&` לפני `||`.
- **קיצור דרך:** ב-`&&`, אם הצד השמאלי `false`, הימני לא נבדק בכלל. ב-`||`, אם השמאלי `true`, הימני לא נבדק. לכן `x != 0 && 10 / x > 1` בטוח גם כש-`x` הוא 0.
- **טווח:** כותבים `x >= 1 && x <= 10`. הכתיב `1 <= x <= 10` הוא שגיאת קומפילציה.

### ‏switch

בחירה לפי ערך מדויק (int, char או String):

```java
int day = 3;
switch (day) {
    case 1:
        System.out.println("Sunday");
        break;
    case 2:
        System.out.println("Monday");
        break;
    case 3:
        System.out.println("Tuesday");
        break;
    default:
        System.out.println("Other");
}
```

- ‏`break` יוצא מה-switch. **בלי break, ממשיכים לבצע את ה-case הבא** (נפילה).
- ‏`default` רץ כשאף case לא התאים.
- אפשר לאחד: `case 6: case 7: System.out.println("Weekend"); break;`

```java
int n = 2;
switch (n) {
    case 1: System.out.println("one");
    case 2: System.out.println("two");
    case 3: System.out.println("three");
}
// מדפיס two ואז three: אין break
```

---

## ‏9. תווים ומחרוזות

### ‏char

- תו אחד, בגרש בודד: `'A'`, `'7'`, `' '`. (`"A"` עם גרשיים כפולים הוא String.)
- כל תו הוא בעצם מספר (קוד): `'A'` = 65, `'a'` = 97, `'0'` = 48.
- האותיות והספרות רצופות: `'b'` = 98, `'B'` = 66, `'1'` = 49.

```java
System.out.println('a' + 1);           // 98   (char ועוד int הוא int)
System.out.println((char) ('a' + 1));  // b
char c = 'x';
c++;                                    // c = 'y'
System.out.println('7' - '0');         // 7    (מתו של ספרה לערך שלה)
System.out.println((int) 'A');         // 65
```

### ‏String: השיטות החשובות

```java
String s = "computer";
s.length()          // 8
s.charAt(0)         // 'c'   האינדקס מתחיל ב-0
s.charAt(7)         // 'r'   האחרון: length() - 1
s.substring(3)      // "puter"  מאינדקס 3 עד הסוף
s.substring(0, 4)   // "comp"   מ-0 עד 4, לא כולל 4
s.substring(2, 5)   // "mpu"    האורך: 5 - 2 = 3
```

| אינדקס | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| תו | c | o | m | p | u | t | e | r |

- ‏`s.charAt(8)` או `s.substring(9)`: שגיאת זמן ריצה (StringIndexOutOfBoundsException).
- ‏`s.substring(8)` מחזיר מחרוזת ריקה `""`.
- התו האחרון: `s.charAt(s.length() - 1)`. החצי הראשון: `s.substring(0, s.length() / 2)`.

### השוואת מחרוזות: equals ולא ==

```java
String a = "hi";
String b = scan.next();      // המשתמש מקליד hi
System.out.println(a.equals(b));  // true:  משווה את התוכן
System.out.println(a == b);       // false: משווה אם זה אותו אובייקט בזיכרון
```

**תמיד `equals` להשוואת מחרוזות.** `==` מתאים למספרים, ל-char ול-boolean.

---

## ‏10. המחלקה Math

לא צריך import.

| שיטה | מה עושה | דוגמה | תוצאה |
|---|---|---|---|
| `Math.sqrt(x)` | שורש | `Math.sqrt(16)` | `4.0` |
| `Math.pow(a, b)` | חזקה a בחזקת b | `Math.pow(2, 3)` | `8.0` |
| `Math.abs(x)` | ערך מוחלט | `Math.abs(-7)` | `7` |
| `Math.max(a, b)` | הגדול | `Math.max(3, 8)` | `8` |
| `Math.min(a, b)` | הקטן | `Math.min(3, 8)` | `3` |
| `Math.round(x)` | עיגול לשלם הקרוב | `Math.round(2.5)` | `3` |
| `Math.floor(x)` | עיגול למטה | `Math.floor(4.9)` | `4.0` |
| `Math.ceil(x)` | עיגול למעלה | `Math.ceil(4.1)` | `5.0` |
| `Math.PI` | π | | `3.141592653589793` |

- ‏`sqrt`, `pow`, `floor` ו-`ceil` מחזירים **double** תמיד: `Math.sqrt(16)` הוא `4.0` ולא `4`.
- עיגול לשתי ספרות אחרי הנקודה: `Math.round(x * 100) / 100.0`.
- הגדול מבין שלושה: `Math.max(a, Math.max(b, c))`.

---

## ‏11. מספרים אקראיים

### המחלקה Random

```java
import java.util.Random;           // בראש הקובץ

Random rnd = new Random();
int a = rnd.nextInt(10);           // 0 עד 9
int dice = rnd.nextInt(6) + 1;     // 1 עד 6
double d = rnd.nextDouble();       // 0.0 עד 1.0, לא כולל 1.0
boolean coin = rnd.nextBoolean();  // true או false
```

‏**`rnd.nextInt(n)` נותן 0 עד n-1**: n ערכים, ו-n עצמו **לא** יוצא.

### הנוסחה לכל טווח

מספר שלם אקראי בין **min** ל-**max**, כולל שניהם:

```java
int x = rnd.nextInt(max - min + 1) + min;
```

- ‏`max - min + 1` = כמה ערכים יש בטווח.
- ‏`+ min` = מאיפה מתחילים.

| רוצים | כותבים |
|---|---|
| 1 עד 6 | `rnd.nextInt(6) + 1` |
| 0 עד 100 | `rnd.nextInt(101)` |
| 10 עד 20 | `rnd.nextInt(11) + 10` |
| -5 עד 5 | `rnd.nextInt(11) - 5` |
| זוגי בין 0 ל-10 | `rnd.nextInt(6) * 2` |

לאחור: `rnd.nextInt(11) + 5` נותן 0 עד 10, ועוד 5: **5 עד 15**.

### דרך נוספת: Math.random()

‏`Math.random()` מחזיר double מ-0.0 עד 1.0 (לא כולל):

```java
int dice = (int) (Math.random() * 6) + 1;   // 1 עד 6
int x = (int) (Math.random() * 11) + 20;    // 20 עד 30
int zero = (int) Math.random() * 6;         // תמיד 0!
```

בשורה האחרונה ההמרה נצמדת ל-`Math.random()`, שתמיד קטן מ-1, אז נחתך ל-0. **הסוגריים קריטיים.**

---

## ‏12. תוכניות קטנות שחוזרות במבחנים

### סכום ספרות

```java
int n = 4729, sum = 0;
while (n > 0) {
    sum += n % 10;  // מוסיפים את ספרת האחדות
    n /= 10;        // ומורידים אותה
}
System.out.println(sum);  // 22
```

### המרת שניות

```java
int t = 3725;
System.out.println(t / 3600 + ":" + t % 3600 / 60 + ":" + t % 60);  // 1:2:5
```

### החלפת ערכים

```java
int a = 3, b = 7;
int temp = a;
a = b;
b = temp;
System.out.println(a + " " + b);  // 7 3
```

### זוגי או אי-זוגי

```java
Scanner scan = new Scanner(System.in);
int n = scan.nextInt();
if (n % 2 == 0) {
    System.out.println(n + " is even");
} else {
    System.out.println(n + " is odd");
}
```

### קוביה וניחוש

```java
Random rnd = new Random();
Scanner scan = new Scanner(System.in);
int dice = rnd.nextInt(6) + 1;
int guess = scan.nextInt();
if (guess == dice) {
    System.out.println("Correct!");
} else {
    System.out.println("Wrong, it was " + dice);
}
```

---

## דגשים: מלכודות נפוצות

1. ‏`7 / 2` הוא `3`. לחילוק עשרוני צריך שאחד הצדדים יהיה double: `7 / 2.0`.
2. ‏`double d = 7 / 2;` נותן `3.0`, לא `3.5`.
3. ‏`(int)` חותך, לא מעגל: `(int) 3.99` הוא `3`. לעיגול: `Math.round`.
4. ‏`"Sum: " + 2 + 3` מדפיס `Sum: 23`. סוגריים סביב החישוב.
5. ‏`'a' + 1` הוא `98` (int), לא `b`.
6. ‏`rnd.nextInt(6)` נותן 0 עד 5. לקוביה: `+ 1`.
7. ‏`(int) Math.random() * 6` תמיד 0. נכון: `(int) (Math.random() * 6)`.
8. `=` הוא השמה, `==` הוא השוואה.
9. מחרוזות משווים ב-`equals`, לא ב-`==`.
10. האינדקס הראשון הוא 0, והאחרון `length() - 1`. ב-`substring(b, e)` התו ב-`e` לא נכלל.
11. בלי `break` ב-switch, ממשיכים ל-case הבא.
12. ‏`printf` לא יורד שורה בלי `%n`.
13. ‏`Math.sqrt` ו-`Math.pow` מחזירים double: `4.0`, לא `4`.
14. שכחתם `import java.util.Scanner;` או `import java.util.Random;`? שגיאת קומפילציה. ל-Math לא צריך import.

## דף עזר מקוצר

```java
import java.util.Scanner;
import java.util.Random;

public class Main {
    public static void main(String[] args) {
        Scanner scan = new Scanner(System.in);
        Random rnd = new Random();

        int n = scan.nextInt();             // קלט: שלם
        double d = scan.nextDouble();       // קלט: עשרוני
        String w = scan.next();             // קלט: מילה

        int r = rnd.nextInt(10) + 1;        // אקראי 1 עד 10
        double avg = (n + r) / 2.0;         // חילוק עשרוני
        int last = n % 10;                  // ספרת האחדות

        System.out.println("avg = " + avg);
        System.out.println(Math.max(n, r) + " " + Math.sqrt(16));
        System.out.println(w.length() + " " + w.charAt(0) + " " + w.substring(1));

        if (n > 0 && n % 2 == 0) {
            System.out.println("positive and even");
        } else if (n > 0) {
            System.out.println("positive and odd");
        } else {
            System.out.println("not positive");
        }
    }
}
```
