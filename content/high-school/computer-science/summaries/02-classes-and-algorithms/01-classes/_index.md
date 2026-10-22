---
title: מחלקות ועצמים
kind: chapter
---

# מחלקות ועצמים

## מחלקה ועצם

- **מחלקה** - **תבנית** ("שרטוט") שמגדירה אילו **תכונות** ואילו **פעולות** יהיו לעצמים מסוג מסוים.
- **עצם** (אובייקט, מופע) - **מימוש** של המחלקה בזיכרון, עם **ערכים** משלו.

מחלקה `Student` אחת - והרבה עצמים: דנה, יוסי, נועה, כל אחד עם שם וציון משלו.

## מבנה מחלקה

```csharp
public class Student
{
    // fields (attributes) - usually private
    private string name;
    private int grade;

    // constructor - builds a new object
    public Student(string name, int grade)
    {
        this.name = name;
        this.grade = grade;
    }

    // getters
    public string GetName() { return this.name; }
    public int GetGrade() { return this.grade; }

    // setter - can protect the object from invalid values
    public void SetGrade(int grade)
    {
        if (grade >= 0 && grade <= 100)
            this.grade = grade;
    }

    // a "real" method
    public bool Passed() { return this.grade >= 55; }

    public override string ToString()
    {
        return this.name + ": " + this.grade;
    }
}
```

| חלק | תפקיד |
|---|---|
| **כותרת** | שם המחלקה |
| **תכונות** | הנתונים של כל עצם - בדרך כלל **`private`** |
| **פעולה בונה** (constructor) | **יוצרת** עצם ומאתחלת את התכונות. שמה **כשם המחלקה**, **בלי** טיפוס מוחזר. אפשר כמה בונות עם **פרמטרים שונים** |
| **פעולות מאחזרות** (`Get`) | **מחזירות** ערך של תכונה |
| **פעולות קובעות** (`Set`) | **משנות** תכונה - ויכולות **לבדוק** שהערך תקין |
| ‏`ToString()` | מחזירה **תיאור כמחרוזת** של העצם (למשל להדפסה) |

## יצירת עצם ושימוש

```csharp
Student s = new Student("Dana", 92);
Console.WriteLine(s.GetName());     // Dana
s.SetGrade(97);
Console.WriteLine(s);               // calls ToString(): "Dana: 97"
```

## ‏this

‏`this` - **העצם הנוכחי**: זה שהפעולה נקראה עליו. משתמשים בו בעיקר כשיש **דו-משמעות** - פרמטר באותו שם כמו תכונה: `this.name = name;`.

## ‏static

| | **רגיל** (של עצם) | ‏**`static`** (של מחלקה) |
|---|---|---|
| **שייך ל-** | **כל עצם** - לכל אחד עותק משלו | **המחלקה** - עותק **אחד** משותף |
| **קריאה** | דרך עצם: `s.GetName()` | דרך המחלקה: `Math.Sqrt(2)`, `int.Parse("5")` |
| **דוגמאות** | שם, ציון | **מונה** כמה עצמים נוצרו; קבוע כמו `PI`; פעולות כלליות |

פעולה `static` **לא יכולה** לגשת לתכונות רגילות - אין לה `this`.

## תיעוד מחלקה

- **בכותרת** - מה המחלקה מייצגת.
- **לכל תכונה** - מה היא מייצגת.
- **לכל פעולה** - מה היא מקבלת ומחזירה.

## שאלות לחזרה

- מה ההבדל בין מחלקה לעצם?
- למה התכונות בדרך כלל `private`? מה היתרון של פעולה קובעת?
- מה ההבדל בין תכונה רגילה לתכונה `static`? תן דוגמה לשימוש בכל אחת.
- כתוב מחלקה `Rectangle` עם אורך, רוחב, פעולה בונה ופעולה שמחזירה את השטח.
