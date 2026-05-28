# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Aoutir Zyad    | 339511 |
| Anass Inani    | 344318|
| Farah Kacem    | 351144|

[Milestone 1](#milestone-1) • [Milestone 2](Milestone-2.pdf) • [Milestone 3](#milestone-3)

## Milestone 1 (20th March, 5pm)

**10% of the final grade**
📄 [Milestone 1 PDF](milestone-1-p.pdf) &nbsp;·&nbsp;


## Milestone 2 (17th April, 5pm)
**10% of the final grade**

📄 [Milestone 2 PDF](Milestone-2.pdf) &nbsp;·&nbsp;
🌐 [Live Website](https://lausanne-evolution-team.github.io/lausanne-evolution/website/)


## Milestone 3 (29th May, 5pm)

**80% of the final grade**


🌐 **Website:** https://lausanne-evolution-team.github.io/lausanne-evolution/website/

🎬 **Screencast**
[See our screencast here](https://youtu.be/9COsj5hscqk)

📖 **Process book**
[Read our process book here](https://github.com/lausanne-evolution-team/lausanne-evolution/blob/master/processbook.pdf)

## 🚀 How to Run Locally

- Clone the repo: `git clone https://github.com/lausanne-evolution-team/lausanne-evolution.git`
- Start a local server from the repo root: `python -m http.server 8000`
- Open in your browser: [http://localhost:8000/website/](http://localhost:8000/website/)

> A local server is required — browsers block CSV loading from `file://` URLs.

To regenerate the CSVs from raw Excel files:
```bash
pip install pandas openpyxl
python preprocessing/clean.py
```

## 📁 Repository Structure
```text
lausanne-evolution/
├── data/
│   ├── raw/                  original Excel files (Statistique Lausanne)
│   └── processed/            clean CSVs + GeoJSON
├── preprocessing/
│   └── clean.py              data preprocessing script
├── website/
│   ├── index.html
│   ├── css/style.css
│   ├── js/                   main.js, lens1-3.js, scrolly.js, animations.js
│   └── data/                 CSV + GeoJSON copies for GitHub Pages
├── processbook.pdf
└── README.md
```

## Late policy

- < 24h: 80% of the grade for the milestone
- < 48h: 70% of the grade for the milestone

