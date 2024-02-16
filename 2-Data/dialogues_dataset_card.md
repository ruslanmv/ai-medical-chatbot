---
configs:
- config_name: default
  data_files:
  - path: data/train-*
    split: train
dataset_info:
  dataset_size: 141665910
  download_size: 141665910
  features:
  - dtype: object
    name: Description
  - dtype: object
    name: Patient
  - dtype: object
    name: Doctor
  splits:
  - name: train
    num_bytes: 141665910
    num_examples: 256916

---
# Dataset Card for "dialogues"

[More Information needed](https://github.com/huggingface/datasets/blob/main/CONTRIBUTING.md#how-to-contribute-to-the-dataset-cards)