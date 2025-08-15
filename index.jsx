import sys
import pyttsx3
import threading
from PyQt5.QtWidgets import (
    QApplication, QWidget, QLabel, QPushButton, QVBoxLayout,
    QHBoxLayout, QLineEdit, QGroupBox, QFrame, QScrollArea,
    QCheckBox, QMessageBox, QSizePolicy, QSpinBox, QSpacerItem
)
from PyQt5.QtGui import QFont, QPalette, QColor, QClipboard
from PyQt5.QtCore import Qt, QSize
from itertools import combinations
import time

# --- Numerology Mappings and Definitions ---
MAPPINGS = {
    "Pythagorean": {
        'A': 1, 'J': 1, 'S': 1, 'B': 2, 'K': 2, 'T': 2, 'C': 3, 'L': 3, 'U': 3,
        'D': 4, 'M': 4, 'V': 4, 'E': 5, 'N': 5, 'W': 5, 'F': 6, 'O': 6, 'X': 6,
        'G': 7, 'P': 7, 'Y': 7, 'H': 8, 'Q': 8, 'Z': 8, 'I': 9, 'R': 9
    },
    "Chaldean": {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 8, 'G': 3, 'H': 5, 'I': 1,
        'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 7, 'P': 8, 'Q': 1, 'R': 2,
        'S': 3, 'T': 4, 'U': 6, 'V': 6, 'W': 6, 'X': 5, 'Y': 1, 'Z': 7
    },
    "Cheiro": {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 8, 'G': 3, 'H': 5, 'I': 1,
        'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 7, 'P': 8, 'Q': 1, 'R': 2,
        'S': 3, 'T': 4, 'U': 6, 'V': 6, 'W': 6, 'X': 5, 'Y': 1, 'Z': 7
    },
    "Kabbalistic": {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9,
        'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 6, 'P': 7, 'Q': 8, 'R': 9,
        'S': 1, 'T': 2, 'U': 3, 'V': 4, 'W': 5, 'X': 6, 'Y': 7, 'Z': 8
    },
    "Tamil/Vedic": {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9,
        'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 6, 'P': 7, 'Q': 8, 'R': 9,
        'S': 1, 'T': 2, 'U': 3, 'V': 4, 'W': 5, 'X': 6, 'Y': 7, 'Z': 8
    },
    "Chinese": {
        'A': 8, 'B': 6, 'C': 3, 'D': 4, 'E': 9, 'F': 2, 'G': 7, 'H': 1, 'I': 5,
        'J': 8, 'K': 6, 'L': 3, 'M': 4, 'N': 9, 'O': 2, 'P': 7, 'Q': 1, 'R': 5,
        'S': 8, 'T': 6, 'U': 3, 'V': 4, 'W': 9, 'X': 2, 'Y': 7, 'Z': 8
    },
    "Islamic (Abjad)": {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 80, 'G': 3, 'H': 5, 'I': 10,
        'J': 60, 'K': 20, 'L': 30, 'M': 40, 'N': 50, 'O': 70, 'P': 80, 'Q': 100,
        'R': 200, 'S': 60, 'T': 400, 'U': 6, 'V': 6, 'W': 6, 'X': 500, 'Y': 10,
        'Z': 700
    }
}

NUMBER_DEFINITIONS = {
    1: "Represents leadership, independence, and new beginnings. Individuals with this number are often driven and innovative.",
    2: "Symbolizes cooperation, balance, and diplomacy. These individuals are often peacemakers, intuitive, and sensitive.",
    3: "Associated with creativity, communication, and self-expression. People with this number are often social, artistic, and optimistic.",
    4: "Represents stability, hard work, and practicality. These individuals are known for their strong foundation and organizational skills.",
    5: "Symbolizes freedom, adventure, and adaptability. People with this number are often dynamic, curious, and love change.",
    6: "Associated with harmony, responsibility, and nurturing. These individuals are often compassionate and focused on family and community.",
    7: "Represents spirituality, introspection, and analysis. Individuals with this number are often wise, philosophical, and seek deeper truths.",
    8: "Symbolizes ambition, power, and financial success. These individuals are often business-minded, authoritative, and focused on achievement.",
    9: "Associated with humanitarianism, compassion, and completion. People with this number are often selfless, generous, and have a broad perspective."
}

SUCCESS_LINES = {
    "Mind Plane": {4, 9, 2},
    "Emotional Plane": {3, 5, 7},
    "Practical Plane": {8, 1, 6}
}

# --- Astrology Definitions ---
ZODIAC_SIGNS = {
    "Aries": (3, 21, 4, 19), "Taurus": (4, 20, 5, 20),
    "Gemini": (5, 21, 6, 20), "Cancer": (6, 21, 7, 22),
    "Leo": (7, 23, 8, 22), "Virgo": (8, 23, 9, 22),
    "Libra": (9, 23, 10, 22), "Scorpio": (10, 23, 11, 21),
    "Sagittarius": (11, 22, 12, 21), "Capricorn": (12, 22, 1, 19),
    "Aquarius": (1, 20, 2, 18), "Pisces": (2, 19, 3, 20)
}

ASTROLOGY_DETAILS = {
    "Aries": {
        "lucky_number": 9, "lucky_color": "Red", "element": "Fire",
        "birthstone": "Diamond", "ruling_planet": "Mars", "lucky_day": "Tuesday"
    },
    "Taurus": {
        "lucky_number": 6, "lucky_color": "Green", "element": "Earth",
        "birthstone": "Emerald", "ruling_planet": "Venus", "lucky_day": "Friday"
    },
    "Gemini": {
        "lucky_number": 5, "lucky_color": "Yellow", "element": "Air",
        "birthstone": "Agate", "ruling_planet": "Mercury", "lucky_day": "Wednesday"
    },
    "Cancer": {
        "lucky_number": 2, "lucky_color": "White", "element": "Water",
        "birthstone": "Pearl", "ruling_planet": "Moon", "lucky_day": "Monday"
    },
    "Leo": {
        "lucky_number": 1, "lucky_color": "Gold", "element": "Fire",
        "birthstone": "Peridot", "ruling_planet": "Sun", "lucky_day": "Sunday"
    },
    "Virgo": {
        "lucky_number": 5, "lucky_color": "Green", "element": "Earth",
        "birthstone": "Sapphire", "ruling_planet": "Mercury", "lucky_day": "Wednesday"
    },
    "Libra": {
        "lucky_number": 6, "lucky_color": "Pink", "element": "Air",
        "birthstone": "Opal", "ruling_planet": "Venus", "lucky_day": "Friday"
    },
    "Scorpio": {
        "lucky_number": 9, "lucky_color": "Black", "element": "Water",
        "birthstone": "Topaz", "ruling_planet": "Pluto", "lucky_day": "Tuesday"
    },
    "Sagittarius": {
        "lucky_number": 3, "lucky_color": "Purple", "element": "Fire",
        "birthstone": "Turquoise", "ruling_planet": "Jupiter", "lucky_day": "Thursday"
    },
    "Capricorn": {
        "lucky_number": 8, "lucky_color": "Brown", "element": "Earth",
        "birthstone": "Garnet", "ruling_planet": "Saturn", "lucky_day": "Saturday"
    },
    "Aquarius": {
        "lucky_number": 4, "lucky_color": "Blue", "element": "Air",
        "birthstone": "Amethyst", "ruling_planet": "Uranus", "lucky_day": "Saturday"
    },
    "Pisces": {
        "lucky_number": 7, "lucky_color": "Sea Green", "element": "Water",
        "birthstone": "Aquamarine", "ruling_planet": "Neptune", "lucky_day": "Thursday"
    }
}


# --- Main Application Window ---
class NMSWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Universal Numerology & Astrology Suite")
        self.setMinimumSize(QSize(1000, 800))

        self.tts_engine = pyttsx3.init()
        self.tts_engine.setProperty('rate', 150)
        self.tts_engine.connect('finished-utterance', self._on_tts_finished)
        self.tts_lock = threading.Lock()
        self.is_tts_paused = False
        self.current_tts_id = None
        self.tts_buttons = {}

        self.output_labels = {}
        self.method_checkboxes = {}
        self.person_input_fields = []
        self.person_output_layouts = []
        self.method_boxes = {}
        self.person_data = {}
        self.astrology_output_labels = {}

        self.default_font_size = 10
        self.analysis_labels_to_style = []

        self.initUI()
        self.update_font_size(self.default_font_size)

    def initUI(self):
        main_scroll_area = QScrollArea(self)
        main_scroll_area.setWidgetResizable(True)
        main_scroll_content = QWidget()
        main_layout = QVBoxLayout(main_scroll_content)

        # --- Method Selection Checkboxes ---
        method_selection_box = QGroupBox("Select Methods to Analyze")
        method_selection_layout = QHBoxLayout(method_selection_box)
        for method_name in MAPPINGS.keys():
            checkbox = QCheckBox(method_name)
            checkbox.setChecked(True)
            self.method_checkboxes[method_name] = checkbox
            method_selection_layout.addWidget(checkbox)
        
        # Add a checkbox for Astrology
        self.astrology_checkbox = QCheckBox("Astrology")
        self.astrology_checkbox.setChecked(True)
        method_selection_layout.addWidget(self.astrology_checkbox)
        
        main_layout.addWidget(method_selection_box)

        # Top layout for inputs and analyze button
        input_frame = QFrame(self)
        input_frame.setFrameShape(QFrame.StyledPanel)
        input_frame.setFrameShadow(QFrame.Sunken)
        input_layout = QVBoxLayout(input_frame)

        person_count_layout = QHBoxLayout()
        person_count_label = QLabel("Number of Persons (1-10):")
        self.person_count_spinbox = QSpinBox()
        self.person_count_spinbox.setRange(1, 10)
        self.person_count_spinbox.setValue(2)
        self.person_count_spinbox.valueChanged.connect(self.update_person_inputs)
        person_count_layout.addWidget(person_count_label)
        person_count_layout.addWidget(self.person_count_spinbox)
        person_count_layout.addStretch(1)
        input_layout.addLayout(person_count_layout)

        self.input_fields_container = QHBoxLayout()
        input_layout.addLayout(self.input_fields_container)

        # --- Compatibility Analysis section ---
        self.compatibility_box = QGroupBox("Joint Compatibility Analysis")
        self.compatibility_box.setCheckable(True)
        self.compatibility_box.setChecked(True)
        self.compatibility_box.setFont(QFont("Arial", 12, QFont.Bold))
        compatibility_box_layout = QVBoxLayout(self.compatibility_box)
        
        compatibility_header_layout = QHBoxLayout()
        compatibility_header_layout.addWidget(QLabel("Compatibility Results:"))
        self.compatibility_play_pause_button = QPushButton("▶ Play")
        self.compatibility_play_pause_button.clicked.connect(self._play_pause_compatibility)
        self.tts_buttons["compatibility"] = self.compatibility_play_pause_button
        compatibility_header_layout.addStretch(1)
        compatibility_header_layout.addWidget(self.compatibility_play_pause_button)
        compatibility_box_layout.addLayout(compatibility_header_layout)

        self.compatibility_scroll_area = QScrollArea(self)
        self.compatibility_scroll_area.setWidgetResizable(True)
        self.compatibility_scroll_area.setMinimumSize(800, 200)
        self.compatibility_content = QWidget()
        compatibility_scroll_layout = QVBoxLayout(self.compatibility_content)

        self.compatibility_output_label = QLabel("Click 'Analyze and Compare' to see compatibility results.", self)
        self.compatibility_output_label.setWordWrap(True)
        self.analysis_labels_to_style.append(self.compatibility_output_label)
        compatibility_scroll_layout.addWidget(self.compatibility_output_label)

        self.compatibility_scroll_area.setWidget(self.compatibility_content)
        compatibility_box_layout.addWidget(self.compatibility_scroll_area)
        # We don't add this to the main layout yet, we add it later after person inputs

        # --- Output layout for side-by-side comparison (Moved to be created earlier) ---
        self.output_layout_container = QHBoxLayout()
        output_frame = QFrame(self)
        output_frame.setFrameShape(QFrame.StyledPanel)
        output_frame.setFrameShadow(QFrame.Sunken)
        output_frame.setLayout(self.output_layout_container)
        main_layout.addWidget(output_frame)

        # Now we can safely call this function
        self.update_person_inputs(2)

        self.analyze_button = QPushButton("Analyze and Compare", self)
        self.analyze_button.setFont(QFont("Arial", 12, QFont.Bold))
        self.analyze_button.clicked.connect(self.analyze_all_methods)
        input_layout.addWidget(self.analyze_button)
        main_layout.addWidget(input_frame)

        # Now add the compatibility box to the main layout
        main_layout.addWidget(self.compatibility_box)

        # Action buttons
        button_layout = QHBoxLayout()
        self.copy_button = QPushButton("Copy All Analysis to Clipboard")
        self.copy_button.clicked.connect(self.copy_to_clipboard)
        font_size_label = QLabel("Analysis Font Size:")
        self.font_size_spinbox = QSpinBox()
        self.font_size_spinbox.setRange(8, 24)
        self.font_size_spinbox.setValue(self.default_font_size)
        self.font_size_spinbox.valueChanged.connect(self.update_font_size)
        self.dark_toggle = QCheckBox("Enable Dark Mode", self)
        self.dark_toggle.stateChanged.connect(self.toggle_dark_mode)

        button_layout.addWidget(self.copy_button)
        button_layout.addStretch(1)
        button_layout.addWidget(font_size_label)
        button_layout.addWidget(self.font_size_spinbox)
        button_layout.addWidget(self.dark_toggle)
        main_layout.addLayout(button_layout)

        main_scroll_area.setWidget(main_scroll_content)
        self.setLayout(QVBoxLayout())
        self.layout().addWidget(main_scroll_area)

    def update_person_inputs(self, count):
        # Clear existing input fields
        for person_dict in self.person_input_fields:
            person_dict['box'].setParent(None)
        self.person_input_fields.clear()
        self.tts_buttons.clear() # Clear TTS buttons as well
        self.tts_buttons["compatibility"] = self.compatibility_play_pause_button
        
        # Create new input fields
        for i in range(count):
            person_input_box = QGroupBox(f"Person {i + 1}")
            person_input_box.setFont(QFont("Arial", 12, QFont.Bold))
            person_input_layout = QVBoxLayout(person_input_box)
            name_input = QLineEdit(self)
            name_input.setPlaceholderText("Enter full name")
            dob_input = QLineEdit(self)
            dob_input.setPlaceholderText("Enter DOB (DD-MM-YYYY)")
            person_input_layout.addWidget(name_input)
            person_input_layout.addWidget(dob_input)
            person_input_box.setMinimumSize(200, 100)
            person_input_box.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)
            self.input_fields_container.addWidget(person_input_box)
            self.person_input_fields.append({'name': name_input, 'dob': dob_input, 'box': person_input_box})
        self.update_output_areas(count)

    def update_output_areas(self, count):
        # Clear existing output areas and labels
        for layout in self.person_output_layouts:
            while layout.count():
                child = layout.takeAt(0)
                if child.widget():
                    child.widget().setParent(None)
        self.person_output_layouts.clear()
        self.output_labels.clear()
        self.astrology_output_labels.clear()
        self.method_boxes.clear()

        while self.output_layout_container.count():
            child = self.output_layout_container.takeAt(0)
            if child.widget():
                child.widget().setParent(None)

        for i in range(count):
            person_scroll_area = QScrollArea(self)
            person_scroll_area.setWidgetResizable(True)
            person_scroll_area.setMinimumSize(400, 300)
            person_scroll_content = QWidget()
            person_scroll_layout = QVBoxLayout(person_scroll_content)
            person_scroll_area.setWidget(person_scroll_content)
            self.output_layout_container.addWidget(person_scroll_area)
            self.person_output_layouts.append(person_scroll_layout)

            # Add Astrology section first
            astrology_box = QFrame(self)
            astrology_box.setFrameShape(QFrame.StyledPanel)
            astrology_box.setFrameShadow(QFrame.Sunken)
            astrology_layout = QVBoxLayout(astrology_box)
            astrology_header_layout = QHBoxLayout()
            astrology_name_label = QLabel(f"⭐ Astrology", self)
            astrology_name_label.setFont(QFont("Arial", 16, QFont.Bold))
            astrology_play_pause_button = QPushButton("▶ Play")
            astrology_tts_id = f"person_{i}_astrology"
            self.tts_buttons[astrology_tts_id] = astrology_play_pause_button
            astrology_play_pause_button.clicked.connect(lambda _, id=astrology_tts_id, p=i, m="astrology": self._play_pause_tts(id, p, m))
            astrology_header_layout.addWidget(astrology_name_label)
            astrology_header_layout.addStretch(1)
            astrology_header_layout.addWidget(astrology_play_pause_button)
            astrology_layout.addLayout(astrology_header_layout)
            astrology_output_label = QLabel("Click 'Analyze and Compare' to see results.", self)
            astrology_output_label.setWordWrap(True)
            self.astrology_output_labels[i] = astrology_output_label
            self.analysis_labels_to_style.append(astrology_output_label)
            astrology_layout.addWidget(astrology_output_label)
            self.person_output_layouts[i].addWidget(astrology_box)
            self.method_boxes[("astrology", i)] = astrology_box

            # Then add Numerology methods
            for method in MAPPINGS.keys():
                method_box = QFrame(self)
                method_box.setFrameShape(QFrame.StyledPanel)
                method_box.setFrameShadow(QFrame.Sunken)
                method_layout = QVBoxLayout(method_box)
                header_layout = QHBoxLayout()
                method_name_label = QLabel(f"🔹 {method}", self)
                method_name_label.setFont(QFont("Arial", 16, QFont.Bold))
                play_pause_button = QPushButton("▶ Play")
                tts_id = f"person_{i}_method_{method}"
                self.tts_buttons[tts_id] = play_pause_button
                play_pause_button.clicked.connect(lambda _, id=tts_id, p=i, m=method: self._play_pause_tts(id, p, m))
                header_layout.addWidget(method_name_label)
                header_layout.addStretch(1)
                header_layout.addWidget(play_pause_button)
                method_layout.addLayout(header_layout)
                output_label = QLabel("Click 'Analyze and Compare' to see results.", self)
                output_label.setWordWrap(True)
                self.output_labels[(method, i)] = output_label
                self.analysis_labels_to_style.append(output_label)
                method_layout.addWidget(output_label)
                self.person_output_layouts[i].addWidget(method_box)
                self.method_boxes[(method, i)] = method_box
        self.output_layout_container.addStretch(1)

    def update_font_size(self, size):
        font = QFont("Arial", size)
        for label in self.analysis_labels_to_style:
            label.setFont(font)

    def analyze_all_methods(self):
        person_count = self.person_count_spinbox.value()
        self._stop_all_tts()
        
        inputs = []
        for i in range(person_count):
            name = self.person_input_fields[i]['name'].text().strip().upper()
            dob = self.person_input_fields[i]['dob'].text().strip()

            if not name or not dob:
                msg = f"❌ Please enter full name and date of birth for Person {i + 1}."
                QMessageBox.warning(self, "Missing Information", msg)
                return

            try:
                day, month, year = map(int, dob.split('-'))
                if not (1 <= day <= 31 and 1 <= month <= 12 and 1900 <= year <= 2100):
                    raise ValueError
            except (ValueError, IndexError):
                msg = f"❌ Please enter a valid date of birth for Person {i + 1} in the format DD-MM-YYYY."
                QMessageBox.warning(self, "Invalid Date Format", msg)
                return
            inputs.append({'name': name, 'dob': dob, 'day': day, 'month': month, 'year': year})

        self.person_data.clear()
        compatibility_text = ""
        selected_methods = [method for method, checkbox in self.method_checkboxes.items() if checkbox.isChecked()]
        is_astrology_selected = self.astrology_checkbox.isChecked()
        
        if not selected_methods and not is_astrology_selected:
            msg = "❌ Please select at least one method (Numerology or Astrology)."
            QMessageBox.warning(self, "No Methods Selected", msg)
            return

        for i in range(person_count):
            self.person_data[i] = {}

        if is_astrology_selected:
            for i in range(person_count):
                self.method_boxes[("astrology", i)].show()
                dob_data = inputs[i]
                zodiac_sign, details, speech_text = self._run_astrology_analysis(dob_data['day'], dob_data['month'])
                self.astrology_output_labels[i].setText(details)
                self.astrology_output_labels[i].speech_text = speech_text
                self.person_data[i]["astrology"] = {"zodiac_sign": zodiac_sign}
        else:
            for i in range(person_count):
                 self.method_boxes[("astrology", i)].hide()

        for method in MAPPINGS.keys():
            is_checked = self.method_checkboxes[method].isChecked()
            for i in range(person_count):
                if is_checked:
                    self.method_boxes[(method, i)].show()
                    name = inputs[i]['name']
                    dob = inputs[i]['dob']
                    result, speech, p_data = self._run_numerology_analysis_for_person(name, dob, method, MAPPINGS[method])
                    self.output_labels[(method, i)].setText(result)
                    self.output_labels[(method, i)].speech_text = speech
                    self.person_data[i][method] = p_data
                else:
                    self.method_boxes[(method, i)].hide()

        if person_count > 1:
            compatibility_text = self._run_group_compatibility_analysis(inputs, selected_methods, is_astrology_selected)
            self.display_compatibility_analysis(compatibility_text)
        else:
            self.compatibility_output_label.setText("No compatibility analysis performed for a single person.")

    def _run_numerology_analysis_for_person(self, name, dob, method, mapping):
        result_text = ""
        speech_text = f"Using the {method} method. "
        person_data = {
            "name": name, "dob": dob, "name_number": None, "lucky_number": None,
            "master_numbers": set(), "present_numbers": set(), "missing_numbers": set(),
            "success_lines": 0
        }
        day, month, year = map(int, dob.split('-'))

        def reduce_to_single_digit(num):
            if num in [11, 22, 33]: return num
            while num > 9: num = sum(int(digit) for digit in str(num))
            return num
        
        def calculate_and_format_sum(input_string, method_mapping):
            calculation_parts, total_sum, present_nums_in_calc = [], 0, set()
            for char in input_string:
                if char in method_mapping:
                    value = method_mapping[char]
                    calculation_parts.append(f"{char}={value}")
                    total_sum += value
                    present_nums_in_calc.add(reduce_to_single_digit(value))
                elif char.isspace(): calculation_parts.append("+")
            return " ".join(calculation_parts), total_sum, present_nums_in_calc
        
        def calculate_dob_digits(dob_str): return [int(d) for d in dob_str if d.isdigit()]

        result_text += "<h3>Name Number Calculation:</h3>"
        name_calc_str, name_total, present_name_nums = calculate_and_format_sum(name, mapping)
        result_text += f"<ul><li>Individual Values: {name_calc_str}</li>"
        result_text += f"<li>Total Sum: {name_total}</li>"
        reduced_name = reduce_to_single_digit(name_total)
        result_text += f"<li>Final Name Number: <b>{reduced_name}</b></li></ul>"
        person_data["name_number"] = reduced_name
        if reduced_name in [11, 22, 33]: person_data["master_numbers"].add(reduced_name)
        speech_text += f"Your name number is {reduced_name}. "

        dob_digits = calculate_dob_digits(dob)
        present_dob_nums = set(reduce_to_single_digit(d) for d in dob_digits)
        result_text += "<h3>Lucky & Life Path Number Calculation:</h3>"
        
        if method == "Tamil/Vedic":
            driver_num, kethu_num = reduce_to_single_digit(day), reduce_to_single_digit(month)
            connector_num = reduce_to_single_digit(sum(dob_digits))
            result_text += f"<ul><li><b>Driver Number:</b> {day} &rarr; <b>{driver_num}</b></li>"
            result_text += f"<li><b>Kethu Number:</b> {month} &rarr; <b>{kethu_num}</b></li>"
            result_text += f"<li><b>Connector Number:</b> {' + '.join(map(str, dob_digits))} &rarr; <b>{connector_num}</b></li></ul>"
            person_data["lucky_number"] = (driver_num, kethu_num, connector_num)
            speech_text += f"Your driver number is {driver_num}. Your Kethu number is {kethu_num}. Your connector number is {connector_num}. "
        else:
            dob_total = sum(dob_digits)
            reduced_dob = reduce_to_single_digit(dob_total)
            result_text += f"<ul><li>Date of Birth Digits: {' + '.join(map(str, dob_digits))}</li>"
            result_text += f"<li>Total Sum: {dob_total}</li>"
            result_text += f"<li>Final Life Path Number: <b>{reduced_dob}</b></li></ul>"
            person_data["lucky_number"] = reduced_dob
            speech_text += f"Your lucky number is {reduced_dob}. "
            if reduced_dob in [11, 22, 33]: person_data["master_numbers"].add(reduced_dob)

        all_numbers = set(range(1, 10))
        present_numbers = present_name_nums.union(present_dob_nums)
        person_data["present_numbers"] = present_numbers
        missing_numbers = sorted(list(all_numbers - present_numbers))
        present_list = sorted(list(present_numbers))
        person_data["missing_numbers"] = set(missing_numbers)
        
        result_text += "<h3>Numerology Profile Analysis:</h3>"
        result_text += "<ul><li><b>What is a Lucky Number?</b><br>Your Lucky Numbers (Name and Life Path/Driver) are considered the core numbers that define your personality, talents, and life's purpose.</li>"
        result_text += "<li><b>What is a Missing Number?</b><br>Missing numbers from your birth date or name can indicate areas where you may need to focus on personal growth, development, or balance in your life.</li></ul>"
        present_missing_str = []
        for num in range(1, 10): present_missing_str.append(f"🟢 {num} (+)" if num in present_list else f"🔴 {num} (-)")
        result_text += f"<h4>Numbers: {' '.join(present_missing_str)}</h4>"
        
        result_text += "<h3>Success Line Analysis:</h3><ul>"
        found_success_line = False
        for line_name, line_numbers in SUCCESS_LINES.items():
            if line_numbers.issubset(present_numbers):
                result_text += f"<li><b>SUCCESS LINE FOUND:</b> You have a complete <b>{line_name}</b>!<br>This line consists of the numbers {line_numbers}. It indicates a strong natural ability in this area of your life.</li>"
                found_success_line = True
                person_data["success_lines"] += 1
        if not found_success_line: result_text += "<li>No complete Success Lines found in your numerology profile.</li>"
        result_text += "</ul>"
        
        result_text += "<h3>Detailed Number Definitions:</h3><ul>"
        for num in sorted(present_numbers):
            definition = NUMBER_DEFINITIONS.get(num, "Definition not available.")
            result_text += f"<li><b>Number {num}:</b> {definition}</li>"
        result_text += "</ul>"
        
        speech_text += (
            f"Your numbers present are {', '.join(map(str, present_list))}. "
            f"Your missing numbers are {', '.join(map(str, missing_numbers))}."
        )
        return result_text, speech_text, person_data

    def _run_astrology_analysis(self, day, month):
        zodiac_sign = "Unknown"
        
        for sign, (start_month, start_day, end_month, end_day) in ZODIAC_SIGNS.items():
            if (month == start_month and day >= start_day) or (month == end_month and day <= end_day):
                zodiac_sign = sign
                break
            elif start_month > end_month: # Handle Capricorn spanning two years
                if (month == start_month and day >= start_day) or (month == end_month and day <= end_day):
                    zodiac_sign = sign
                    break
        
        details = ASTROLOGY_DETAILS.get(zodiac_sign, {})

        result_text = f"<h3>Your Zodiac Sign is: <b>{zodiac_sign}</b></h3><ul>"
        speech_text = f"Your zodiac sign is {zodiac_sign}. "
        
        if details:
            result_text += f"<li><b>Lucky Number:</b> {details.get('lucky_number')}</li>"
            speech_text += f"Your lucky number is {details.get('lucky_number')}. "
            
            result_text += f"<li><b>Lucky Color:</b> {details.get('lucky_color')}</li>"
            speech_text += f"Your lucky color is {details.get('lucky_color')}. "

            result_text += f"<li><b>Favorable Element:</b> {details.get('element')}</li>"
            speech_text += f"Your favorable element is {details.get('element')}. "

            result_text += f"<li><b>Birthstone:</b> {details.get('birthstone')}</li>"
            speech_text += f"Your birthstone is {details.get('birthstone')}. "

            result_text += f"<li><b>Ruling Planet:</b> {details.get('ruling_planet')}</li>"
            speech_text += f"Your ruling planet is {details.get('ruling_planet')}. "
            
            result_text += f"<li><b>Lucky Day:</b> {details.get('lucky_day')}</li>"
            speech_text += f"Your lucky day is {details.get('lucky_day')}. "

        result_text += "</ul>"
        
        return zodiac_sign, result_text, speech_text

    def _run_group_compatibility_analysis(self, inputs, selected_methods, is_astrology_selected):
        final_summary_parts = []
        final_summary_parts.append("<h3>Overall Group Compatibility Summary</h3>")
        
        person_count = len(inputs)
        person_power = {i: 0 for i in range(person_count)}
        for i in range(person_count):
            for method in selected_methods:
                p_data = self.person_data[i].get(method, {})
                person_power[i] += p_data.get("success_lines", 0)
                if isinstance(p_data.get("lucky_number"), int) and p_data.get("lucky_number") in [11, 22, 33]:
                    person_power[i] += 1
        
        sorted_power = sorted(person_power.items(), key=lambda item: item[1], reverse=True)
        final_summary_parts.append("<h4>Group Power Ranking (based on Numerology Master Numbers & Success Lines):</h4><ul>")
        for rank, (index, score) in enumerate(sorted_power):
            name = inputs[index]['name']
            final_summary_parts.append(f"<li>{rank + 1}. {name} (Score: {score})</li>")
        final_summary_parts.append("</ul>")

        good_factors = set()
        bad_factors = set()
        for p1_index, p2_index in combinations(range(person_count), 2):
            p1_name = inputs[p1_index]['name']
            p2_name = inputs[p2_index]['name']
            
            # Numerology checks
            for method in selected_methods:
                p1_data = self.person_data[p1_index].get(method, {})
                p2_data = self.person_data[p2_index].get(method, {})
                
                if p1_data.get("lucky_number") == p2_data.get("lucky_number") and p1_data.get("lucky_number"):
                    good_factors.add(f"Matching Life Path Number ({p1_data['lucky_number']}) between {p1_name} and {p2_name} in {method}.")
                
                p1_fills_p2 = p1_data.get("present_numbers", set()).intersection(p2_data.get("missing_numbers", set()))
                if p1_fills_p2:
                    good_factors.add(f"{p1_name} provides missing numbers {sorted(list(p1_fills_p2))} for {p2_name}.")
                
                shared_missing = p1_data.get("missing_numbers", set()).intersection(p2_data.get("missing_numbers", set()))
                if shared_missing:
                    bad_factors.add(f"Shared missing numbers ({sorted(list(shared_missing))}) between {p1_name} and {p2_name} in {method}.")
            
            # Astrology check
            if is_astrology_selected:
                p1_zodiac = self.person_data[p1_index].get("astrology", {}).get("zodiac_sign")
                p2_zodiac = self.person_data[p2_index].get("astrology", {}).get("zodiac_sign")
                if p1_zodiac and p2_zodiac and p1_zodiac == p2_zodiac:
                    good_factors.add(f"Shared Zodiac Sign ({p1_zodiac}) between {p1_name} and {p2_name}.")
        
        if good_factors:
            final_summary_parts.append("<h4>Group Synergy (Positive Dynamics):</h4><ul>")
            final_summary_parts.extend([f"<li>{item}</li>" for item in good_factors])
            final_summary_parts.append("</ul>")
        
        if bad_factors:
            final_summary_parts.append("<h4>Group Challenges (Potential Conflict & Growth Areas):</h4><ul>")
            final_summary_parts.extend([f"<li>{item}</li>" for item in bad_factors])
            final_summary_parts.append("</ul>")

        return "".join(final_summary_parts)

    def display_compatibility_analysis(self, compatibility_analysis_text):
        self.compatibility_output_label.setText(compatibility_analysis_text)
        self.compatibility_output_label.speech_text = self._format_tts_text(compatibility_analysis_text)
        
    def _format_tts_text(self, text_with_html):
        clean_text = text_with_html.replace('<h3>', '... ').replace('</h3>', '... ')
        clean_text = clean_text.replace('<h4>', '... ').replace('</h4>', '... ')
        clean_text = clean_text.replace('<ul>', '. ').replace('</ul>', '. ')
        clean_text = clean_text.replace('<li>', '. ').replace('</li>', '. ')
        clean_text = clean_text.replace('<b>', '').replace('</b>', '')
        clean_text = clean_text.replace('✅', 'Check. ').replace('❌', 'Cross. ')
        clean_text = clean_text.replace(':', ', ').replace(';','.')
        return clean_text

    def _play_pause_tts(self, tts_id, person_id=None, method=None):
        with self.tts_lock:
            button = self.tts_buttons.get(tts_id)
            if not button:
                return
            
            if self.current_tts_id and self.current_tts_id != tts_id:
                self.tts_engine.stop()
                if self.current_tts_id in self.tts_buttons:
                    old_button = self.tts_buttons[self.current_tts_id]
                    old_button.setText("▶ Play")
                self.is_tts_paused = False

            if self.tts_engine.isBusy() and not self.is_tts_paused and self.current_tts_id == tts_id:
                self.tts_engine.pause()
                self.is_tts_paused = True
                button.setText("▶ Resume")
            elif self.tts_engine.isBusy() and self.is_tts_paused and self.current_tts_id == tts_id:
                self.tts_engine.resume()
                self.is_tts_paused = False
                button.setText("⏸ Pause")
            else:
                self.is_tts_paused = False
                button.setText("⏸ Pause")
                self.current_tts_id = tts_id
                
                text_to_speak = ""
                if tts_id == "compatibility":
                    text_to_speak = getattr(self.compatibility_output_label, 'speech_text', None)
                elif method == "astrology":
                    text_to_speak = getattr(self.astrology_output_labels.get(person_id), 'speech_text', None)
                else:
                    text_to_speak = getattr(self.output_labels.get((method, person_id)), 'speech_text', None)
                
                if text_to_speak:
                    threading.Thread(target=self._speak_thread, args=(text_to_speak, tts_id), daemon=True).start()
                else:
                    button.setText("▶ Play")
                    self.current_tts_id = None
                    msg = "Please click 'Analyze and Compare' first to generate the calculations."
                    QMessageBox.information(self, "No Text to Speak", msg)


    def _play_pause_compatibility(self):
        self._play_pause_tts("compatibility")


    def _speak_thread(self, message, tts_id):
        with self.tts_lock:
            if self.current_tts_id == tts_id:
                self.tts_engine.say(message, tts_id)
                self.tts_engine.runAndWait()


    def _on_tts_finished(self, name, completed):
        if completed and name in self.tts_buttons:
            self.tts_buttons[name].setText("▶ Play")
            self.current_tts_id = None
            self.is_tts_paused = False
    
    def _stop_all_tts(self):
        with self.tts_lock:
            self.tts_engine.stop()
            self.is_tts_paused = False
            self.current_tts_id = None
            for button in self.tts_buttons.values():
                button.setText("▶ Play")

    def copy_to_clipboard(self):
        full_text = self._format_for_clipboard()
        QApplication.clipboard().setText(full_text)
        QMessageBox.information(self, "Copied to Clipboard", "The entire analysis has been copied to your clipboard.")

    def _format_for_clipboard(self):
        clipboard_text = []
        person_count = self.person_count_spinbox.value()
        
        for i in range(person_count):
            clipboard_text.append(f"\n--- Analysis for Person {i+1} ---\n")
            
            # Astrology output
            if self.astrology_checkbox.isChecked():
                clipboard_text.append(f"\n### Person {i+1} (Astrology)\n")
                html_content = self.astrology_output_labels[i].text()
                clipboard_text.append(self._html_to_plaintext(html_content))
            
            # Numerology outputs
            for method, checkbox in self.method_checkboxes.items():
                if checkbox.isChecked():
                    clipboard_text.append(f"\n### Person {i+1} ({method})\n")
                    html_content = self.output_labels[(method, i)].text()
                    clipboard_text.append(self._html_to_plaintext(html_content))
        
        clipboard_text.append("\n--- Joint Compatibility Analysis ---\n")
        html_content = self.compatibility_output_label.text()
        clipboard_text.append(self._html_to_plaintext(html_content))
        
        return "\n".join(clipboard_text)

    def _html_to_plaintext(self, html_content):
        # A simple HTML to plaintext converter
        text = html_content.replace('<h3>', '\n\n')
        text = text.replace('</h3>', '\n')
        text = text.replace('<h4>', '\n\n')
        text = text.replace('</h4>', '\n')
        text = text.replace('<ul>', '\n')
        text = text.replace('</ul>', '\n')
        text = text.replace('<li>', '- ')
        text = text.replace('</li>', '\n')
        text = text.replace('<b>', '')
        text = text.replace('</b>', '')
        text = text.replace('<br>', '\n')
        text = text.replace('&rarr;', '->')
        text = text.replace('✅', '(Success)')
        text = text.replace('❌', '(Failure)')
        return text.strip()


    def toggle_dark_mode(self):
        palette = QPalette()
        if self.dark_toggle.isChecked():
            palette.setColor(QPalette.Window, QColor(30, 30, 30))
            palette.setColor(QPalette.WindowText, QColor(220, 220, 220))
            palette.setColor(QPalette.Base, QColor(50, 50, 50))
            palette.setColor(QPalette.Text, QColor(220, 220, 220))
            palette.setColor(QPalette.Button, QColor(50, 50, 50))
            palette.setColor(QPalette.ButtonText, QColor(220, 220, 220))
            palette.setColor(QPalette.ToolTipBase, QColor(50, 50, 50))
            palette.setColor(QPalette.ToolTipText, QColor(220, 220, 220))
        else:
            palette.setColor(QPalette.Window, QColor(240, 240, 240))
            palette.setColor(QPalette.WindowText, QColor(0, 0, 0))
            palette.setColor(QPalette.Base, QColor(255, 255, 255))
            palette.setColor(QPalette.Text, QColor(0, 0, 0))
            palette.setColor(QPalette.Button, QColor(240, 240, 240))
            palette.setColor(QPalette.ButtonText, QColor(0, 0, 0))
            palette.setColor(QPalette.ToolTipBase, QColor(255, 255, 220))
            palette.setColor(QPalette.ToolTipText, QColor(0, 0, 0))
        self.setPalette(palette)
        app.setPalette(palette)


if __name__ == '__main__':
    app = QApplication(sys.argv)
    ex = NMSWindow()
    ex.show()
    sys.exit(app.exec_())
