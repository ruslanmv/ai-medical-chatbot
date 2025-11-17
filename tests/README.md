# AI Medical Chatbot - Test Suite

## Overview

This directory contains comprehensive unit and integration tests for the AI Medical Chatbot system.

## Structure

```
tests/
├── __init__.py                          # Test package initialization
├── conftest.py                          # Pytest fixtures and configuration
├── README.md                            # This file
├── unit/                                # Unit tests
│   ├── __init__.py
│   └── test_utils.py                    # Utility function tests
└── integration/                         # Integration tests
    ├── __init__.py
    └── test_chatbot_integration.py      # Chatbot integration tests
```

## Running Tests

### Run all tests
```bash
make test
```

### Run unit tests only
```bash
make test-unit
```

### Run integration tests only
```bash
make test-integration
```

### Run tests with coverage
```bash
make test-cov
```

### Run specific test file
```bash
pytest tests/unit/test_utils.py -v
```

### Run specific test class
```bash
pytest tests/unit/test_utils.py::TestStringUtils -v
```

### Run specific test function
```bash
pytest tests/unit/test_utils.py::TestStringUtils::test_string_sanitization -v
```

## Test Markers

Tests are marked with the following pytest markers:

- `@pytest.mark.unit` - Unit tests (fast, isolated)
- `@pytest.mark.integration` - Integration tests (may require external services)
- `@pytest.mark.slow` - Tests that take longer to execute

### Run tests excluding slow tests
```bash
pytest -m "not slow"
```

### Run only integration tests
```bash
pytest -m integration
```

## Writing Tests

### Unit Test Example

```python
import pytest

class TestMyFeature:
    @pytest.mark.unit
    def test_my_function(self):
        """Test that my function works correctly."""
        result = my_function("input")
        assert result == "expected_output"
```

### Integration Test Example

```python
import pytest

class TestMyIntegration:
    @pytest.mark.integration
    def test_complete_flow(self, sample_data):
        """Test the complete workflow."""
        result = process_workflow(sample_data)
        assert result is not None
```

## Fixtures

Common fixtures are defined in `conftest.py`:

- `test_env_vars` - Test environment variables
- `mock_openai_client` - Mocked OpenAI client
- `mock_watsonx_client` - Mocked WatsonX client
- `mock_milvus_connection` - Mocked Milvus connection
- `sample_medical_question` - Sample medical question
- `sample_medical_answer` - Sample medical answer
- `sample_interview_history` - Sample interview history

## Code Coverage

Coverage reports are generated in:
- Terminal output (summary)
- `htmlcov/index.html` (detailed HTML report)

Open the HTML report:
```bash
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
```

## Best Practices

1. **Test Isolation** - Each test should be independent
2. **Clear Names** - Use descriptive test function names
3. **Arrange-Act-Assert** - Structure tests clearly
4. **Mock External Services** - Don't rely on external APIs in tests
5. **Test Edge Cases** - Include boundary conditions and error cases
6. **Keep Tests Fast** - Unit tests should run in milliseconds
7. **Use Fixtures** - Share common test data via fixtures
8. **Document Tests** - Add docstrings explaining test purpose

## Continuous Integration

Tests are automatically run in CI/CD pipeline using:
```bash
make ci
```

## Author

**Ruslan Magana Vsevolodovna**
- Website: [ruslanmv.com](https://ruslanmv.com)
- License: Apache 2.0
