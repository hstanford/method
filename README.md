# method
A language made of... methods


Example program:

```
= {
    y: <
        = { a: () }
        .a.add('!!!')
    >,
    z: 'Hello World',
    m: <
        = { j: (), k: (,3) }
        .j.slice(0, k)
    >
}

.z(.y)(.m, 12)(.log)
```

The above should log out 'Hello World!'
