load("//third_party/bazel_rules/rules_python/python:py_binary.bzl", "py_binary")

package(default_visibility = ["//visibility:public"])

py_binary(
    name = "server",
    srcs = ["server.py"],
    data = glob([
        "static/**",
    ]),
    deps = [
        "//third_party/py/flask:flask_without_jinja",
        "//third_party/py/google/genai",
    ],
)
