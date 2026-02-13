"""
数据库模型定义 - 学生答题记录持久化存储
使用 SQLAlchemy ORM + MySQL
"""
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class Student(db.Model):
    """学生表"""
    __tablename__ = 'students'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(50), unique=True, nullable=False, comment='学号')
    name = db.Column(db.String(100), default='', comment='姓名')
    class_name = db.Column(db.String(100), default='', comment='班级')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # 关系
    answer_records = db.relationship('AnswerRecord', backref='student', lazy='dynamic')
    mastery_records = db.relationship('KnowledgeMastery', backref='student', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'name': self.name,
            'class_name': self.class_name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class AnswerRecord(db.Model):
    """答题记录表"""
    __tablename__ = 'answer_records'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_db_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    session_id = db.Column(db.String(64), comment='会话ID')
    topic = db.Column(db.String(50), comment='知识点')
    difficulty = db.Column(db.String(10), comment='难度')
    problem_text = db.Column(db.Text, comment='题目内容')
    submitted_code = db.Column(db.Text, comment='提交的代码')
    diagnosis_result = db.Column(db.Text, comment='诊断结果')
    is_correct = db.Column(db.Boolean, default=False, comment='是否正确')
    language = db.Column(db.String(20), default='C', comment='编程语言')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student.student_id if self.student else None,
            'session_id': self.session_id,
            'topic': self.topic,
            'difficulty': self.difficulty,
            'problem_text': self.problem_text,
            'submitted_code': self.submitted_code,
            'is_correct': self.is_correct,
            'language': self.language,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class KnowledgeMastery(db.Model):
    """知识点掌握度表"""
    __tablename__ = 'knowledge_mastery'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_db_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    topic = db.Column(db.String(50), nullable=False, comment='知识点')
    correct_count = db.Column(db.Integer, default=0, comment='正确次数')
    total_count = db.Column(db.Integer, default=0, comment='总次数')
    mastery_level = db.Column(db.String(10), default='简单', comment='掌握难度级别')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 联合唯一约束：同一学生同一知识点只有一条记录
    __table_args__ = (
        db.UniqueConstraint('student_db_id', 'topic', name='uq_student_topic'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student.student_id if self.student else None,
            'topic': self.topic,
            'correct_count': self.correct_count,
            'total_count': self.total_count,
            'mastery_level': self.mastery_level,
            'accuracy': round(self.correct_count / self.total_count * 100, 1) if self.total_count > 0 else 0,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


def get_or_create_student(student_id, name='', class_name=''):
    """获取或创建学生记录"""
    student = Student.query.filter_by(student_id=student_id).first()
    if not student:
        student = Student(student_id=student_id, name=name, class_name=class_name)
        db.session.add(student)
        db.session.commit()
    return student


def save_answer_record(student_id, session_id, topic, difficulty, problem_text,
                       submitted_code, diagnosis_result, is_correct, language='C'):
    """保存答题记录并更新知识点掌握度"""
    student = get_or_create_student(student_id)

    # 保存答题记录
    record = AnswerRecord(
        student_db_id=student.id,
        session_id=session_id,
        topic=topic,
        difficulty=difficulty,
        problem_text=problem_text,
        submitted_code=submitted_code,
        diagnosis_result=diagnosis_result,
        is_correct=is_correct,
        language=language
    )
    db.session.add(record)

    # 更新知识点掌握度
    mastery = KnowledgeMastery.query.filter_by(
        student_db_id=student.id, topic=topic
    ).first()
    if not mastery:
        mastery = KnowledgeMastery(
            student_db_id=student.id,
            topic=topic,
            correct_count=1 if is_correct else 0,
            total_count=1,
            mastery_level=difficulty
        )
        db.session.add(mastery)
    else:
        mastery.total_count += 1
        if is_correct:
            mastery.correct_count += 1
        mastery.mastery_level = difficulty
        mastery.updated_at = datetime.utcnow()

    db.session.commit()
    return record
