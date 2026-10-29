---
description: SOLID principles — five rules for object-oriented design that keep classes focused, extensible without modification, safely substitutable, interface-minimal, and dependency-inverted.
---

# SOLID Principles

---

## Single Responsibility Principle (SRP)

**A class should have one, and only one, reason to change.**

```python
# ❌ Multiple responsibilities — database, email, and reporting all in one class
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email

    def save(self):
        db.save(self)

    def send_welcome_email(self):
        smtp.send(self.email, "Welcome!")

    def generate_report(self):
        return f"Report for {self.name}"

# ✅ Each class has one reason to change
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email
        if '@' not in email:
            raise InvalidEmailError()

class UserRepository:
    def save(self, user: User):
        db.save(user)

class EmailService:
    def send_welcome_email(self, user: User):
        smtp.send(user.email, "Welcome!")

class UserReportGenerator:
    def generate(self, user: User):
        return f"Report for {user.name}"
```

---

## Open/Closed Principle (OCP)

**Software entities should be open for extension but closed for modification.**

```python
# ❌ Adding a new customer type requires editing this function
class DiscountCalculator:
    def calculate(self, order, customer_type):
        if customer_type == "regular":
            return order.total * 0.05
        elif customer_type == "premium":
            return order.total * 0.10
        elif customer_type == "vip":
            return order.total * 0.20

# ✅ New discount types extend without touching existing code
class DiscountStrategy(ABC):
    @abstractmethod
    def calculate(self, order) -> float:
        pass

class RegularDiscount(DiscountStrategy):
    def calculate(self, order) -> float:
        return order.total * 0.05

class PremiumDiscount(DiscountStrategy):
    def calculate(self, order) -> float:
        return order.total * 0.10

class VIPDiscount(DiscountStrategy):
    def calculate(self, order) -> float:
        return order.total * 0.20

class DiscountCalculator:
    def __init__(self, strategy: DiscountStrategy):
        self.strategy = strategy

    def calculate(self, order):
        return self.strategy.calculate(order)

# Adding seasonal discounts: just add a new class, nothing else changes
class SeasonalDiscount(DiscountStrategy):
    def calculate(self, order) -> float:
        return order.total * 0.15
```

---

## Liskov Substitution Principle (LSP)

**Derived classes must be substitutable for their base classes.**

```python
# ❌ Square breaks the Rectangle contract — set_width has an unexpected side effect
class Rectangle:
    def set_width(self, width):
        self.width = width

    def set_height(self, height):
        self.height = height

    def area(self):
        return self.width * self.height

class Square(Rectangle):
    def set_width(self, width):
        self.width = width
        self.height = width  # Caller doesn't expect this

    def set_height(self, height):
        self.width = height  # Caller doesn't expect this
        self.height = height

def test_rectangle(rect: Rectangle):
    rect.set_width(5)
    rect.set_height(4)
    assert rect.area() == 20  # Fails when rect is a Square

# ✅ Both types share only the contract they can actually honour
class Shape(ABC):
    @abstractmethod
    def area(self) -> float:
        pass

class Rectangle(Shape):
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def area(self) -> float:
        return self.width * self.height

class Square(Shape):
    def __init__(self, side):
        self.side = side

    def area(self) -> float:
        return self.side * self.side

def calculate_total_area(shapes: list[Shape]) -> float:
    return sum(shape.area() for shape in shapes)  # Works for any Shape
```

---

## Interface Segregation Principle (ISP)

**Clients should not be forced to depend on interfaces they don't use.**

```python
# ❌ Robot is forced to implement eat and sleep
class Worker(ABC):
    @abstractmethod
    def work(self): pass

    @abstractmethod
    def eat(self): pass

    @abstractmethod
    def sleep(self): pass

class Robot(Worker):
    def work(self): print("Working...")
    def eat(self): raise NotImplementedError("Robots don't eat")
    def sleep(self): raise NotImplementedError("Robots don't sleep")

# ✅ Each implementor only handles what it actually does
class Workable(ABC):
    @abstractmethod
    def work(self): pass

class Eatable(ABC):
    @abstractmethod
    def eat(self): pass

class Sleepable(ABC):
    @abstractmethod
    def sleep(self): pass

class Human(Workable, Eatable, Sleepable):
    def work(self): print("Working...")
    def eat(self): print("Eating...")
    def sleep(self): print("Sleeping...")

class Robot(Workable):
    def work(self): print("Working...")
```

---

## Dependency Inversion Principle (DIP)

**High-level modules should not depend on low-level modules. Both should depend on abstractions.**

```python
# ❌ UserService is locked to MySQL — swapping databases requires rewriting the service
class UserService:
    def __init__(self):
        self.db = MySQLDatabase()  # Concrete dependency

    def create_user(self, user):
        self.db.save(user)

# ✅ Both sides depend on the abstraction
class Database(ABC):
    @abstractmethod
    def save(self, data): pass

class MySQLDatabase(Database):
    def save(self, data):
        # MySQL implementation
        pass

class PostgreSQLDatabase(Database):
    def save(self, data):
        # PostgreSQL implementation
        pass

class UserService:
    def __init__(self, database: Database):  # Depends on abstraction
        self.db = database

    def create_user(self, user):
        self.db.save(user)  # Works with any Database

# Swap implementations at the composition root, not inside the service
user_service = UserService(MySQLDatabase())
user_service = UserService(PostgreSQLDatabase())
```

---

## Applying SOLID Together

```python
from abc import ABC, abstractmethod

class PaymentProcessor(ABC):
    """Abstraction (DIP) — open for extension (OCP)"""
    @abstractmethod
    def process(self, amount: float) -> bool:
        pass

class CreditCardProcessor(PaymentProcessor):
    def process(self, amount: float) -> bool:
        return True  # Credit card logic

class PayPalProcessor(PaymentProcessor):
    def process(self, amount: float) -> bool:
        return True  # PayPal logic — substitutable for CreditCardProcessor (LSP)

class Order:
    """Single responsibility: manage order data (SRP)"""
    def __init__(self, items, total):
        self.items = items
        self.total = total

class PaymentService:
    """Single responsibility: handle payments (SRP); depends on abstraction (DIP)"""
    def __init__(self, processor: PaymentProcessor):
        self.processor = processor

    def process_payment(self, order: Order) -> bool:
        return self.processor.process(order.total)

class EmailService:
    """Single responsibility: send emails (SRP)"""
    def send_receipt(self, order: Order):
        pass

# Composition root — swap payment methods without touching service code (OCP)
payment_service = PaymentService(CreditCardProcessor())
payment_service = PaymentService(PayPalProcessor())
```

---

## Audit Checklist

When reviewing a codebase for SOLID violations:

1. **Classes with multiple reasons to change (SRP)** — a class touches database, email, and HTTP concerns; or a change in persistence requires editing the same file as a change in formatting
2. **if/elif chains on type that grow with new types (OCP)** — adding a new variant requires editing an existing function rather than adding a new class
3. **Subclasses that override methods with `NotImplementedError` or change inherited behaviour unexpectedly (LSP)** — callers cannot safely substitute the subtype
4. **Interface methods that some implementors always stub out or raise (ISP)** — the interface is forcing irrelevant contracts onto implementors
5. **High-level class directly instantiating low-level dependencies (DIP)** — `self.db = MySQLDatabase()` or `self.mailer = smtplib.SMTP(...)` inside a service constructor
6. **Abstract base class with only one concrete implementation** — may be premature abstraction (balance with KISS: only invert when there is real variability)
7. **Extension points added before a second use case exists (OCP/YAGNI)** — Strategy or plugin systems for hypothetical future variants

---

## Decision Framework

| Principle | Ask |
|-----------|-----|
| SRP | Does this class have more than one reason to change? |
| OCP | Can I add new behaviour without editing existing code? |
| LSP | Can I substitute any subtype for the base type without surprises? |
| ISP | Are any implementors forced to stub out methods they don't need? |
| DIP | Does a high-level class directly instantiate a low-level dependency? |

---

## Related Principles

- **KISS** — don't over-apply SOLID; an abstract base class with one implementation is complexity without benefit
- **YAGNI** — don't introduce extension points before the second concrete use case exists
- **DRY** — SRP prevents duplication of responsibility; DRY prevents duplication of knowledge
- **SoC** — SRP is SoC applied at the class level; DIP enables SoC between layers
